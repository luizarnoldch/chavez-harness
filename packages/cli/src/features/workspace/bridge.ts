import type {
  ChatGenerateProgressPhase,
  ChatGenerateToolCall,
  ChatMessageDto,
  ChatSessionDto,
  ChatSessionWithMessagesDto,
  WsReply,
} from "@chavez-harness/shared";
import { ChavezWsClient } from "./ws/client.ts";
import { ensureHost } from "./ws/ensure-host.ts";

export type LinkStatus = "disconnected" | "connected" | "synced";

export type GenerateStreamState = {
  sessionId: string;
  phase: ChatGenerateProgressPhase;
  draftText: string;
  draftTools: ChatGenerateToolCall[];
};

export type WorkspaceBridgeState = {
  status: LinkStatus;
  path: string;
  workspaceId: string | null;
  chatSessionId: string | null;
  error: string | null;
  generateStream: GenerateStreamState | null;
  machineOnline: boolean;
};

type Listener = () => void;

function textFromParts(parts: ChatMessageDto["parts"]): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
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
  private client: ChavezWsClient | null = null;
  private listeners = new Set<Listener>();
  private messageListeners = new Set<(sessionId: string) => void>();
  private sessions = new Map<string, ChatSessionWithMessagesDto>();
  private closing = false;
  private daemonRetryInFlight = false;
  private state: WorkspaceBridgeState = {
    status: "disconnected",
    path: process.cwd(),
    workspaceId: null,
    chatSessionId: null,
    error: null,
    generateStream: null,
    machineOnline: false,
  };

  getState(): WorkspaceBridgeState {
    return this.state;
  }

  getSession(id: string): ChatSessionWithMessagesDto | undefined {
    return this.sessions.get(id);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onSessionMessages(listener: (sessionId: string) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  private setState(patch: Partial<WorkspaceBridgeState>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private applyMessage(sessionId: string, message: ChatMessageDto) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (session.messages.some((m) => m.id === message.id)) return;
    const messages = [...session.messages, message].sort((a, b) => a.seq - b.seq);
    this.sessions.set(sessionId, { ...session, messages });
    for (const listener of this.messageListeners) listener(sessionId);
  }

  async connect(apiUrl: string, token: string, path = process.cwd()): Promise<void> {
    this.closing = false;
    this.daemonRetryInFlight = false;
    this.setState({ path, status: "disconnected", error: null, machineOnline: false });

    this.client?.close();
    this.client = new ChavezWsClient({
      apiUrl,
      token,
      autoReconnect: true,
      onPush: (message) => this.handlePush(message),
    });

    await this.client.connect();

    try {
      await ensureHost();
    } catch (err) {
      this.setState({
        error: err instanceof Error ? err.message : "Host no arrancó",
      });
    }

    const bind = await this.client.request<{ workspaceId: string }>({
      type: "workspace.bind",
      id: crypto.randomUUID(),
      path,
      clientKind: "client",
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
    this.setState({ chatSessionId: opened.id });

    const sync = await this.client.request<{
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
            session?: { id: string };
            message?: ChatMessageDto;
          }
        | undefined;
      if (data?.session?.id && data.message) {
        this.applyMessage(data.session.id, data.message);
        if (
          data.message.role === "assistant" &&
          this.state.generateStream?.sessionId === data.session.id
        ) {
          this.setState({ generateStream: null });
        }
      }
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
    }
  }

  clearGenerateStream() {
    if (this.state.generateStream) {
      this.setState({ generateStream: null });
    }
  }

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
    this.sessions.set(reply.data.id, reply.data);
    this.setState({ chatSessionId: reply.data.id });
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
    this.sessions.set(opened.data.id, opened.data);
    this.setState({ chatSessionId: opened.data.id });
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
    return reply.data.sessions;
  }

  async deleteSession(chatSessionId: string): Promise<void> {
    if (!this.client || !this.state.workspaceId) {
      throw new Error("Workspace no conectado");
    }
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
    this.sessions.delete(chatSessionId);
    if (this.state.chatSessionId === chatSessionId) {
      this.setState({ chatSessionId: null });
    }
  }

  async openSession(
    chatSessionId: string,
    afterSeq?: number,
  ): Promise<ChatSessionWithMessagesDto> {
    if (!this.client || !this.state.workspaceId) {
      throw new Error("Workspace no conectado");
    }
    const reply = await this.client.request<ChatSessionWithMessagesDto>({
      type: "session.open",
      id: crypto.randomUUID(),
      workspaceId: this.state.workspaceId,
      chatSessionId,
      afterSeq,
    });
    if (!reply.ok || !reply.data) {
      throw new Error(reply.error ?? "Sesión no encontrada");
    }

    if (afterSeq != null) {
      const existing = this.sessions.get(chatSessionId);
      if (existing) {
        const byId = new Map(existing.messages.map((m) => [m.id, m]));
        for (const m of reply.data.messages) byId.set(m.id, m);
        const merged = {
          ...reply.data,
          messages: [...byId.values()].sort((a, b) => a.seq - b.seq),
        };
        this.sessions.set(chatSessionId, merged);
        return merged;
      }
    }

    this.sessions.set(reply.data.id, reply.data);
    this.setState({ chatSessionId: reply.data.id });
    return reply.data;
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
      this.sessions.set(input.chatSessionId, {
        ...reply.data.session,
        messages,
      });
      this.setState({ generateStream: null });
      for (const listener of this.messageListeners) listener(input.chatSessionId);
    }

    return reply;
  }

  async close(): Promise<void> {
    if (this.closing) return;
    this.closing = true;
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
    });
  }
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
