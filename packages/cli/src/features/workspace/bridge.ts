import type {
  ChatGenerateProgressPhase,
  ChatGenerateToolCall,
  ChatMessageDto,
  ChatMode,
  ChatSessionDto,
  ChatSessionWithMessagesDto,
  PushOrigin,
  WsReply,
} from "@chavez-harness/shared";
import { ChavezWsClient, type ChavezWsClientOptions, type WsClientLike } from "./ws/client.ts";
import { ensureHost } from "./ws/ensure-host.ts";

export type LinkStatus = "disconnected" | "connected" | "synced";

export type GenerateStreamState = {
  sessionId: string;
  phase: ChatGenerateProgressPhase;
  draftText: string;
  draftTools: ChatGenerateToolCall[];
};

/** Mode / provider / model of the session currently open in the TUI (kept live from pushes). */
export type CurrentSessionSettings = {
  id: string;
  mode: ChatMode;
  provider: string;
  model: string;
};

export type SessionSettingsPatch = {
  mode?: ChatMode;
  provider?: string;
  model?: string;
  title?: string | null;
};

export type SessionDeletedEvent = {
  deletedId: string;
  /** Session opened in its place (current session deleted remotely); null if none could be opened. */
  nextId: string | null;
  origin: PushOrigin | null;
  /** True when this TUI issued the delete itself. */
  local: boolean;
};

export type WorkspaceBridgeState = {
  status: LinkStatus;
  path: string;
  workspaceId: string | null;
  chatSessionId: string | null;
  error: string | null;
  generateStream: GenerateStreamState | null;
  machineOnline: boolean;
  currentSession: CurrentSessionSettings | null;
  /** Transient message for the status bar (e.g. session deleted from the web). */
  notice: string | null;
};

export type WorkspaceBridgeOptions = {
  /** Socket client factory; tests inject a fake. */
  createClient?: (options: ChavezWsClientOptions) => WsClientLike;
  ensureHost?: () => Promise<unknown>;
  /** Drop a remote generation that stopped reporting progress (default 60s). */
  streamStaleMs?: number;
  /** How long a status-bar notice stays visible (default 8s). */
  noticeMs?: number;
};

type Listener = () => void;

const STREAM_STALE_MS = 60_000;
const NOTICE_MS = 8_000;

function textFromParts(parts: ChatMessageDto["parts"]): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** Same order as the server list: newest activity first, brand-new (never messaged) sessions on top. */
export function compareSessionsForList(a: ChatSessionDto, b: ChatSessionDto): number {
  if (a.lastMessageAt !== b.lastMessageAt) {
    if (a.lastMessageAt == null) return -1;
    if (b.lastMessageAt == null) return 1;
    return b.lastMessageAt.localeCompare(a.lastMessageAt);
  }
  return b.createdAt.localeCompare(a.createdAt);
}

function originLabel(origin: PushOrigin | null | undefined): string {
  if (origin === "web") return "la web";
  if (origin === "tui") return "otro TUI";
  if (origin === "api") return "la API";
  return "otro cliente";
}

function sameSettings(
  a: CurrentSessionSettings | null,
  b: CurrentSessionSettings | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.mode === b.mode && a.provider === b.provider && a.model === b.model;
}

/**
 * True while a generation is in flight for the session, whoever started it (this TUI or the web).
 * The prompt must not send in the meantime.
 */
export function isSessionGenerating(
  state: Pick<WorkspaceBridgeState, "generateStream">,
  sessionId: string | null | undefined,
): boolean {
  return Boolean(sessionId && state.generateStream?.sessionId === sessionId);
}

export function upsertDraftTool(
  tools: ChatGenerateToolCall[],
  tool: ChatGenerateToolCall,
): ChatGenerateToolCall[] {
  const idx = tools.findIndex((t) => t.id === tool.id);
  if (idx >= 0) {
    const next = tools.slice();
    next[idx] = { ...next[idx], ...tool };
    return next;
  }
  return [...tools, tool];
}

export class WorkspaceBridge {
  private client: WsClientLike | null = null;
  private listeners = new Set<Listener>();
  private messageListeners = new Set<(sessionId: string) => void>();
  private sessionListeners = new Set<Listener>();
  private deletedListeners = new Set<(event: SessionDeletedEvent) => void>();
  private sessions = new Map<string, ChatSessionWithMessagesDto>();
  /** Sessions cached before the socket dropped; refetched in full when opened again. */
  private staleSessions = new Set<string>();
  private sessionsList: ChatSessionDto[] = [];
  /** Deletes this TUI issued: their `session.deleted` echo must not trigger a replacement. */
  private locallyDeleting = new Set<string>();
  private closing = false;
  private daemonRetryInFlight = false;
  private resyncRunning = false;
  private resyncQueued = false;
  private streamTimer: ReturnType<typeof setTimeout> | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  private state: WorkspaceBridgeState = {
    status: "disconnected",
    path: process.cwd(),
    workspaceId: null,
    chatSessionId: null,
    error: null,
    generateStream: null,
    machineOnline: false,
    currentSession: null,
    notice: null,
  };

  constructor(private readonly options: WorkspaceBridgeOptions = {}) {}

  getState(): WorkspaceBridgeState {
    return this.state;
  }

  getSession(id: string): ChatSessionWithMessagesDto | undefined {
    return this.sessions.get(id);
  }

  /** Sessions of the workspace, kept live from `session.updated` / `session.deleted` pushes. */
  getSessionsList(): ChatSessionDto[] {
    return this.sessionsList;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onSessionMessages(listener: (sessionId: string) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /** Fires whenever {@link getSessionsList} changes. */
  subscribeSessions(listener: Listener): () => void {
    this.sessionListeners.add(listener);
    return () => this.sessionListeners.delete(listener);
  }

  /** Fires after a session was deleted (by anyone); see {@link SessionDeletedEvent}. */
  onSessionDeleted(listener: (event: SessionDeletedEvent) => void): () => void {
    this.deletedListeners.add(listener);
    return () => this.deletedListeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  private emitSessions() {
    for (const listener of this.sessionListeners) listener();
  }

  private setState(patch: Partial<WorkspaceBridgeState>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private notifyMessages(sessionId: string) {
    for (const listener of this.messageListeners) listener(sessionId);
  }

  private createClient(options: ChavezWsClientOptions): WsClientLike {
    return this.options.createClient
      ? this.options.createClient(options)
      : new ChavezWsClient(options);
  }

  // --- current session / cache -------------------------------------------------

  private settingsFor(id: string | null): CurrentSessionSettings | null {
    if (!id) return null;
    const session = this.sessions.get(id);
    if (!session) return null;
    return { id, mode: session.mode, provider: session.provider, model: session.model };
  }

  private setCurrentSessionId(id: string | null) {
    this.setState({ chatSessionId: id, currentSession: this.settingsFor(id) });
  }

  private refreshCurrentSettings() {
    const next = this.settingsFor(this.state.chatSessionId);
    if (!sameSettings(this.state.currentSession, next)) {
      this.setState({ currentSession: next });
    }
  }

  private cacheSession(session: ChatSessionWithMessagesDto) {
    this.sessions.set(session.id, session);
    this.staleSessions.delete(session.id);
    const { messages: _messages, ...meta } = session;
    this.upsertListed(meta);
  }

  private upsertListed(dto: ChatSessionDto) {
    if (this.state.workspaceId && dto.workspaceId !== this.state.workspaceId) return;
    const next = this.sessionsList.filter((s) => s.id !== dto.id);
    next.push(dto);
    next.sort(compareSessionsForList);
    this.sessionsList = next;
    this.emitSessions();
  }

  private removeListed(id: string) {
    if (!this.sessionsList.some((s) => s.id === id)) return;
    this.sessionsList = this.sessionsList.filter((s) => s.id !== id);
    this.emitSessions();
  }

  /** Apply a session row (keeps cached messages) and refresh list + current settings. */
  private applySessionDto(dto: ChatSessionDto) {
    const cached = this.sessions.get(dto.id);
    if (cached) this.sessions.set(dto.id, { ...cached, ...dto });
    this.upsertListed(dto);
    if (dto.id === this.state.chatSessionId) this.refreshCurrentSettings();
  }

  private applyMessage(sessionId: string, message: ChatMessageDto, sessionMeta?: ChatSessionDto) {
    if (sessionMeta) this.applySessionDto(sessionMeta);
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (session.messages.some((m) => m.id === message.id)) return;

    const lastSeq = session.messages.at(-1)?.seq ?? 0;
    const messages = [...session.messages, message].sort((a, b) => a.seq - b.seq);
    this.sessions.set(sessionId, { ...session, messages });
    this.notifyMessages(sessionId);

    if (message.seq > lastSeq + 1) {
      // Missed pushes in between: pull what is missing instead of trusting a holey cache.
      void this.openSession(sessionId, lastSeq).catch(() => {
        this.staleSessions.add(sessionId);
      });
    }
  }

  // --- connect / reconnect ---------------------------------------------------------

  async connect(apiUrl: string, token: string, path = process.cwd()): Promise<void> {
    this.closing = false;
    this.daemonRetryInFlight = false;
    this.setState({ path, status: "disconnected", error: null, machineOnline: false });

    this.client?.close();
    const client: WsClientLike = this.createClient({
      apiUrl,
      token,
      autoReconnect: true,
      onPush: (message) => this.handlePush(message),
      onOpen: (info) => this.handleSocketOpen(client, info),
      onClose: () => this.handleSocketClosed(client),
    });
    this.client = client;

    await client.connect();

    try {
      await (this.options.ensureHost ?? ensureHost)();
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : "Host no arrancó",
      });
    }

    const bind = await client.request<{ workspaceId: string }>({
      type: "workspace.bind",
      id: crypto.randomUUID(),
      path,
      clientKind: "client",
      clientLabel: "tui",
    });

    if (!bind.ok || !bind.data?.workspaceId) {
      this.setState({ status: "disconnected", error: bind.error ?? "Bind falló" });
      throw new Error(bind.error ?? "workspace.bind failed");
    }

    this.setState({
      workspaceId: bind.data.workspaceId,
      status: "connected",
    });

    const hostOnline = await this.waitForHostOnline(12_000);
    if (!hostOnline) {
      this.setState({
        error: this.state.error ?? "PC offline: el Host no está conectado",
      });
    }

    const daemonSetOk = await this.requestDaemonOn(bind.data.workspaceId);
    if (!daemonSetOk) {
      this.setState({
        error: this.state.error ?? "No se pudo activar el daemon",
      });
    }

    const opened = await this.openLatestOrCreate();
    this.setCurrentSessionId(opened.id);

    const sync = await client.request<{
      daemonStatus: "online" | "offline" | "stale";
      machineStatus?: "online" | "offline";
    }>({
      type: "workspace.sync",
      id: crypto.randomUUID(),
      workspaceId: bind.data.workspaceId,
      chatSessionId: opened.id,
    });

    const machineOnline = sync.data?.machineStatus === "online";
    const daemonOnline = sync.ok && sync.data?.daemonStatus === "online";
    this.setState({
      machineOnline,
      status: machineOnline && daemonOnline ? "synced" : "connected",
      ...(daemonOnline ? { error: null } : {}),
    });
  }

  private handleSocketClosed(client: WsClientLike) {
    if (this.closing || client !== this.client) return;
    // Pushes are lost while offline: cached sessions can no longer be trusted as-is.
    this.staleSessions = new Set(this.sessions.keys());
    this.clearStreamTimer();
    this.setState({ status: "disconnected", machineOnline: false, generateStream: null });
  }

  private async handleSocketOpen(client: WsClientLike, info: { reconnect: boolean }) {
    if (!info.reconnect || this.closing || client !== this.client) return;
    if (this.resyncRunning) {
      this.resyncQueued = true;
      return;
    }
    this.resyncRunning = true;
    try {
      do {
        this.resyncQueued = false;
        await this.resync(client);
      } while (this.resyncQueued && !this.closing);
    } finally {
      this.resyncRunning = false;
    }
  }

  /** After a reconnect: bind again, sync presence, then catch up the open session. */
  private async resync(client: WsClientLike) {
    try {
      const bind = await client.request<{ workspaceId: string }>({
        type: "workspace.bind",
        id: crypto.randomUUID(),
        path: this.state.path,
        clientKind: "client",
        clientLabel: "tui",
      });
      if (!bind.ok || !bind.data?.workspaceId) {
        this.setState({ error: bind.error ?? "Bind falló" });
        return;
      }
      const workspaceId = bind.data.workspaceId;
      this.setState({ workspaceId, status: "connected", error: null });

      const currentId = this.state.chatSessionId;
      const sync = await client.request<{
        daemonStatus: "online" | "offline" | "stale";
        machineStatus?: "online" | "offline";
      }>({
        type: "workspace.sync",
        id: crypto.randomUUID(),
        workspaceId,
        ...(currentId ? { chatSessionId: currentId } : {}),
      });
      const machineOnline = sync.data?.machineStatus === "online";
      const daemonOnline = sync.ok && sync.data?.daemonStatus === "online";
      this.setState({
        machineOnline,
        status: machineOnline && daemonOnline ? "synced" : "connected",
      });

      if (currentId && this.sessions.has(currentId)) {
        await this.catchUpSession(currentId);
      }
      if (machineOnline && !daemonOnline) {
        void this.retryDaemonSetOnHostOnline();
      }
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : "No se pudo resincronizar",
      });
    }
  }

  /** Pull messages missed while offline (`session.open {afterSeq}`) and merge them into the cache. */
  private async catchUpSession(sessionId: string) {
    const cached = this.sessions.get(sessionId);
    if (!cached) return;
    try {
      await this.openSession(sessionId, cached.messages.at(-1)?.seq ?? 0);
    } catch (err) {
      if (err instanceof Error && err.message === SESSION_NOT_FOUND) {
        // Deleted while we were offline.
        this.handleSessionDeleted(sessionId, null);
        return;
      }
      throw err;
    }
  }

  private async waitForHostOnline(timeoutMs: number): Promise<boolean> {
    if (this.state.machineOnline) return true;
    const deadline = Date.now() + timeoutMs;
    while (!this.closing && Date.now() < deadline) {
      if (this.state.machineOnline) return true;
      const workspaceId = this.state.workspaceId;
      if (this.client && workspaceId) {
        try {
          const sync = await this.client.request<{
            machineStatus?: "online" | "offline";
          }>({
            type: "workspace.sync",
            id: crypto.randomUUID(),
            workspaceId,
          });
          if (sync.data?.machineStatus === "online") {
            this.setState({ machineOnline: true });
            return true;
          }
        } catch {
          // keep polling
        }
      }
      await Bun.sleep(400);
    }
    return this.state.machineOnline;
  }

  private async requestDaemonOn(workspaceId: string): Promise<boolean> {
    if (!this.client) return false;
    let lastDaemonError: string | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (this.closing) return false;
      if (attempt > 0) await Bun.sleep(300 * attempt);
      const daemonSet = await this.client.request<{
        daemonStatus?: "online" | "offline" | "stale";
      }>({
        type: "workspace.daemon.set",
        id: crypto.randomUUID(),
        workspaceId,
        desired: "on",
        source: "tui",
      });
      if (daemonSet.ok) {
        if (daemonSet.data?.daemonStatus === "online") {
          this.setState({ status: "synced", error: null });
        }
        return true;
      }
      lastDaemonError = daemonSet.error;
    }
    if (lastDaemonError) {
      this.setState({ error: lastDaemonError });
    }
    return false;
  }

  private async retryDaemonSetOnHostOnline() {
    if (this.daemonRetryInFlight || this.closing) return;
    if (this.state.status === "synced") return;
    const workspaceId = this.state.workspaceId;
    if (!workspaceId || !this.client) return;

    this.daemonRetryInFlight = true;
    try {
      const ok = await this.requestDaemonOn(workspaceId);
      if (ok) {
        this.setState({ error: null });
      }
    } finally {
      this.daemonRetryInFlight = false;
    }
  }

  // --- pushes ----------------------------------------------------------------------

  private handlePush(message: Record<string, unknown>) {
    if (message.type === "machine.presence") {
      const data = message.data as { status?: string } | undefined;
      const machineOnline = data?.status === "online";
      this.setState({
        machineOnline,
        status:
          machineOnline && this.state.status === "synced"
            ? "synced"
            : this.state.workspaceId
              ? this.state.status === "synced" && !machineOnline
                ? "connected"
                : this.state.status
              : "disconnected",
      });
      if (machineOnline && this.state.workspaceId && this.state.status !== "synced") {
        void this.retryDaemonSetOnHostOnline();
      }
      return;
    }

    if (message.type === "connection.status") {
      const data = message.data as
        | { daemon?: "online" | "offline" | "stale"; workspaceId?: string }
        | undefined;
      if (data?.workspaceId && data.workspaceId === this.state.workspaceId) {
        this.setState({
          status:
            data.daemon === "online" && this.state.machineOnline !== false
              ? "synced"
              : "connected",
        });
      }
      return;
    }

    if (message.type === "daemon.presence") {
      const data = message.data as
        | { workspaceId?: string; status?: string }
        | undefined;
      if (data?.workspaceId === this.state.workspaceId) {
        this.setState({
          status:
            data.status === "online" && this.state.machineOnline !== false
              ? "synced"
              : "connected",
        });
      }
      return;
    }

    if (message.type === "session.message.created") {
      const data = message.data as
        | {
            session?: ChatSessionDto;
            message?: ChatMessageDto;
          }
        | undefined;
      if (data?.session?.id && data.message) {
        this.applyMessage(data.session.id, data.message, data.session);
        if (
          data.message.role === "assistant" &&
          this.state.generateStream?.sessionId === data.session.id
        ) {
          this.clearGenerateStream();
        }
      }
      return;
    }

    if (message.type === "session.updated") {
      const data = message.data as ChatSessionDto | undefined;
      if (!data?.id) return;
      if (this.state.workspaceId && data.workspaceId !== this.state.workspaceId) return;
      this.applySessionDto(data);
      if (message.change === "message" && this.state.generateStream?.sessionId === data.id) {
        this.clearGenerateStream();
      }
      return;
    }

    if (message.type === "session.deleted") {
      const data = message.data as { workspaceId?: string; chatSessionId?: string } | undefined;
      if (!data?.chatSessionId) return;
      if (this.state.workspaceId && data.workspaceId !== this.state.workspaceId) return;
      this.handleSessionDeleted(
        data.chatSessionId,
        (message.origin as PushOrigin | undefined) ?? null,
      );
      return;
    }

    if (message.type === "chat.generate.progress") {
      const data = message.data as
        | {
            sessionId?: string;
            phase?: ChatGenerateProgressPhase;
            textDelta?: string;
            toolCall?: ChatGenerateToolCall;
          }
        | undefined;
      if (!data?.sessionId || !data.phase) return;
      const prev =
        this.state.generateStream?.sessionId === data.sessionId
          ? this.state.generateStream
          : null;
      const draftText =
        data.phase === "streaming" && data.textDelta
          ? `${prev?.draftText ?? ""}${data.textDelta}`
          : (prev?.draftText ?? "");
      let draftTools = prev?.draftTools ?? [];
      if (data.toolCall) {
        draftTools = upsertDraftTool(draftTools, data.toolCall);
      }
      this.setState({
        generateStream: {
          sessionId: data.sessionId,
          phase: data.phase,
          draftText,
          draftTools,
        },
      });
      this.armStreamTimer();
    }
  }

  private handleSessionDeleted(id: string, origin: PushOrigin | null) {
    const wasCurrent = this.state.chatSessionId === id;
    const local = this.locallyDeleting.has(id);
    this.sessions.delete(id);
    this.staleSessions.delete(id);
    this.removeListed(id);
    if (this.state.generateStream?.sessionId === id) this.clearGenerateStream();

    if (!wasCurrent) return;
    // `deleteSession()` resets the current session and its caller navigates away.
    if (local) return;
    void this.replaceDeletedCurrent(id, origin);
  }

  private async replaceDeletedCurrent(deletedId: string, origin: PushOrigin | null) {
    const label = shortId(deletedId);
    this.setCurrentSessionId(null);
    this.setNotice(`Conversación ${label} eliminada desde ${originLabel(origin)} · abriendo otra…`);
    let nextId: string | null = null;
    try {
      const next = await this.openLatestOrCreate();
      nextId = next.id;
      this.setNotice(
        `Conversación ${label} eliminada desde ${originLabel(origin)} · ahora en ${shortId(next.id)}`,
      );
    } catch {
      this.setNotice(
        `Conversación ${label} eliminada desde ${originLabel(origin)} · no se pudo abrir otra`,
      );
    }
    for (const listener of this.deletedListeners) {
      listener({ deletedId, nextId, origin, local: false });
    }
  }

  // --- generate stream / notice -----------------------------------------------------

  private clearStreamTimer() {
    if (this.streamTimer) {
      clearTimeout(this.streamTimer);
      this.streamTimer = null;
    }
  }

  /** A remote generation that goes silent must not block the prompt forever. */
  private armStreamTimer() {
    this.clearStreamTimer();
    this.streamTimer = setTimeout(
      () => this.clearGenerateStream(),
      this.options.streamStaleMs ?? STREAM_STALE_MS,
    );
    this.streamTimer.unref?.();
  }

  clearGenerateStream() {
    this.clearStreamTimer();
    if (this.state.generateStream) {
      this.setState({ generateStream: null });
    }
  }

  private setNotice(text: string) {
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.setState({ notice: text });
    this.noticeTimer = setTimeout(() => this.clearNotice(), this.options.noticeMs ?? NOTICE_MS);
    this.noticeTimer.unref?.();
  }

  clearNotice() {
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer);
      this.noticeTimer = null;
    }
    if (this.state.notice) this.setState({ notice: null });
  }

  // --- requests ---------------------------------------------------------------------

  async openLatestOrCreate(): Promise<ChatSessionWithMessagesDto> {
    if (!this.client || !this.state.workspaceId) {
      throw new Error("Workspace no conectado");
    }
    const reply = await this.client.request<ChatSessionWithMessagesDto>({
      type: "session.open",
      id: crypto.randomUUID(),
      workspaceId: this.state.workspaceId,
    });
    if (!reply.ok || !reply.data) {
      throw new Error(reply.error ?? "No se pudo abrir la sesión");
    }
    this.cacheSession(reply.data);
    this.setCurrentSessionId(reply.data.id);
    return reply.data;
  }

  async createSession(options?: {
    provider?: string;
    model?: string;
    title?: string;
  }): Promise<ChatSessionWithMessagesDto> {
    if (!this.client || !this.state.workspaceId) {
      throw new Error("Workspace no conectado");
    }
    const created = await this.client.request<{ id: string }>({
      type: "session.create",
      id: crypto.randomUUID(),
      workspaceId: this.state.workspaceId,
      title: options?.title,
      provider: options?.provider,
      model: options?.model,
    });
    if (!created.ok || !created.data?.id) {
      throw new Error(created.error ?? "No se pudo crear la sesión");
    }
    const opened = await this.client.request<ChatSessionWithMessagesDto>({
      type: "session.open",
      id: crypto.randomUUID(),
      workspaceId: this.state.workspaceId,
      chatSessionId: created.data.id,
    });
    if (!opened.ok || !opened.data) {
      throw new Error(opened.error ?? "No se pudo abrir la sesión nueva");
    }
    this.cacheSession(opened.data);
    this.setCurrentSessionId(opened.data.id);
    return opened.data;
  }

  async listSessions(): Promise<ChatSessionDto[]> {
    if (!this.client || !this.state.workspaceId) {
      throw new Error("Workspace no conectado");
    }
    const reply = await this.client.request<{ sessions: ChatSessionDto[] }>({
      type: "session.list",
      id: crypto.randomUUID(),
      workspaceId: this.state.workspaceId,
    });
    if (!reply.ok || !reply.data?.sessions) {
      throw new Error(reply.error ?? "No se pudieron listar las sesiones");
    }
    this.sessionsList = [...reply.data.sessions].sort(compareSessionsForList);
    this.emitSessions();
    return this.sessionsList;
  }

  async deleteSession(chatSessionId: string): Promise<void> {
    if (!this.client || !this.state.workspaceId) {
      throw new Error("Workspace no conectado");
    }
    this.locallyDeleting.add(chatSessionId);
    try {
      const reply = await this.client.request<{
        workspaceId: string;
        chatSessionId: string;
      }>({
        type: "session.delete",
        id: crypto.randomUUID(),
        chatSessionId,
      });
      if (!reply.ok) {
        throw new Error(reply.error ?? "No se pudo eliminar la sesión");
      }
    } finally {
      this.locallyDeleting.delete(chatSessionId);
    }
    this.sessions.delete(chatSessionId);
    this.staleSessions.delete(chatSessionId);
    this.removeListed(chatSessionId);
    if (this.state.chatSessionId === chatSessionId) {
      this.setCurrentSessionId(null);
    }
  }

  /**
   * Open a session. A cached session kept fresh by pushes is served from the cache;
   * with `afterSeq` only the missing tail is fetched and merged into the cache.
   */
  async openSession(
    chatSessionId: string,
    afterSeq?: number,
  ): Promise<ChatSessionWithMessagesDto> {
    if (!this.client || !this.state.workspaceId) {
      throw new Error("Workspace no conectado");
    }
    const existing = this.sessions.get(chatSessionId);

    if (afterSeq == null && existing && !this.staleSessions.has(chatSessionId)) {
      this.setCurrentSessionId(chatSessionId);
      return existing;
    }

    const tailOnly = afterSeq != null && existing != null;
    const reply = await this.client.request<ChatSessionWithMessagesDto>({
      type: "session.open",
      id: crypto.randomUUID(),
      workspaceId: this.state.workspaceId,
      chatSessionId,
      ...(tailOnly ? { afterSeq } : {}),
    });
    if (!reply.ok || !reply.data) {
      throw new Error(reply.error ?? SESSION_NOT_FOUND);
    }

    if (tailOnly && existing) {
      const byId = new Map(existing.messages.map((m) => [m.id, m]));
      for (const m of reply.data.messages) byId.set(m.id, m);
      const merged = {
        ...reply.data,
        messages: [...byId.values()].sort((a, b) => a.seq - b.seq),
      };
      this.cacheSession(merged);
      if (chatSessionId === this.state.chatSessionId) this.refreshCurrentSettings();
      this.notifyMessages(chatSessionId);
      return merged;
    }

    this.cacheSession(reply.data);
    this.setCurrentSessionId(reply.data.id);
    return reply.data;
  }

  /** Persist Plan/Build, provider/model or title; the reply updates cache, list and current settings. */
  async updateSession(
    chatSessionId: string,
    patch: SessionSettingsPatch,
  ): Promise<ChatSessionDto> {
    if (!this.client) throw new Error("Workspace no conectado");
    const reply = await this.client.request<{ session: ChatSessionDto; changed: string[] }>({
      type: "session.update",
      id: crypto.randomUUID(),
      chatSessionId,
      ...patch,
    });
    if (!reply.ok || !reply.data?.session) {
      throw new Error(reply.error ?? "No se pudo actualizar la sesión");
    }
    this.applySessionDto(reply.data.session);
    return reply.data.session;
  }

  async sendMessage(input: {
    chatSessionId: string;
    text: string;
    mode: "plan" | "build";
    provider?: string;
    model?: string;
    clientMessageId?: string;
  }): Promise<WsReply> {
    if (!this.client) throw new Error("Workspace no conectado");
    const reply = await this.client.request<{
      session: ChatSessionWithMessagesDto;
      userMessage: ChatMessageDto;
      assistantMessage: ChatMessageDto;
    }>({
      type: "chat.send",
      id: crypto.randomUUID(),
      ...input,
    });

    if (reply.ok && reply.data) {
      const session = this.sessions.get(input.chatSessionId);
      const base = session ?? {
        ...reply.data.session,
        messages: [],
      };
      const messages = [...base.messages];
      for (const m of [reply.data.userMessage, reply.data.assistantMessage]) {
        if (!messages.some((x) => x.id === m.id)) messages.push(m);
      }
      messages.sort((a, b) => a.seq - b.seq);
      this.cacheSession({
        ...reply.data.session,
        messages,
      });
      this.refreshCurrentSettings();
      this.clearGenerateStream();
      this.notifyMessages(input.chatSessionId);
    }

    return reply;
  }

  async close(): Promise<void> {
    if (this.closing) return;
    this.closing = true;
    this.clearStreamTimer();
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer);
      this.noticeTimer = null;
    }
    const workspaceId = this.state.workspaceId;
    const client = this.client;

    if (client && workspaceId) {
      try {
        await client.request({
          type: "workspace.daemon.set",
          id: crypto.randomUUID(),
          workspaceId,
          desired: "off",
          source: "tui",
        });
      } catch {
        // best-effort; web pin may ignore
      }
    }

    client?.close();
    this.client = null;
    this.setState({
      status: "disconnected",
      workspaceId: null,
      machineOnline: false,
      notice: null,
    });
  }
}

const SESSION_NOT_FOUND = "Sesión no encontrada";

function shortId(id: string): string {
  return id.slice(0, 8);
}

export function messageToTurnText(message: ChatMessageDto): string {
  return textFromParts(message.parts);
}

let bridgeSingleton: WorkspaceBridge | null = null;

export function getWorkspaceBridge(): WorkspaceBridge {
  if (!bridgeSingleton) {
    bridgeSingleton = new WorkspaceBridge();
  }
  return bridgeSingleton;
}

export function resetWorkspaceBridge(): void {
  void bridgeSingleton?.close();
  bridgeSingleton = new WorkspaceBridge();
}
