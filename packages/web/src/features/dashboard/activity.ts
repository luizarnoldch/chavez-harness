import {
  CHAT_GENERATE_TIMEOUT_MS,
  chatGenerateProgressPushSchema,
  connectionStatusPushSchema,
  daemonPresencePushSchema,
  machinePresencePushSchema,
  sessionDeletedPushSchema,
  sessionMessageCreatedPushSchema,
  sessionUpdatedPushSchema,
  workspaceUpdatedPushSchema,
  type ChatGenerateProgressPhase,
  type ChatMessageDto,
  type ChatSessionDto,
  type DashboardSession,
  type DashboardSnapshot,
  type DashboardWorkspace,
  type MachineStatus,
  type PushOrigin,
} from "@chavez-harness/shared";

/** Pure state + reducer behind the dashboard, rail badges and workspace list. */

export const ACTIVITY_LIMIT = 50;
export const RECENT_SESSIONS_LIMIT = 10;
/** The server gives up on a generate after this long; a draft with no progress is stale. */
export const GENERATING_TTL_MS = CHAT_GENERATE_TIMEOUT_MS + 10_000;
/** A daemon flip within this window of a `daemon.desired` change is attributed to its origin. */
const DESIRED_ORIGIN_WINDOW_MS = 15_000;
const SNIPPET_LENGTH = 90;

export type ActivityKind =
  | "message"
  | "session.created"
  | "session.deleted"
  | "session.mode"
  | "session.model"
  | "daemon"
  | "machine"
  | "workspace";

export type ActivityEntry = {
  id: string;
  /** Epoch ms when this tab saw the push. */
  at: number;
  kind: ActivityKind;
  origin: PushOrigin | null;
  workspaceId: string | null;
  sessionId: string | null;
  /**
   * Kind-specific value: message role (`user` | `assistant` | `assistant-error`),
   * new mode/model, or daemon/machine status.
   */
  detail: string | null;
  /** Message snippet or session title. */
  text: string | null;
};

export type GeneratingPhase = ChatGenerateProgressPhase | "waiting";

export type GeneratingSession = {
  sessionId: string;
  workspaceId: string;
  phase: GeneratingPhase;
  startedAt: number;
  updatedAt: number;
  /** Name of the tool currently running, if any. */
  toolName: string | null;
};

export type UserActivityState = {
  /** A dashboard snapshot has been applied at least once. */
  loaded: boolean;
  machineStatus: MachineStatus;
  workspaces: Record<string, DashboardWorkspace>;
  recentSessions: DashboardSession[];
  sessionsToday: number;
  /** Epoch ms of the local midnight the "today" counter is relative to. */
  todayStart: number;
  generating: Record<string, GeneratingSession>;
  /** Newest first, at most ACTIVITY_LIMIT. */
  activity: ActivityEntry[];
  /** Last `daemon.desired` change per workspace (attributes the daemon flip that follows). */
  desiredOrigin: Record<string, { origin: PushOrigin | null; at: number }>;
};

export type ActivityEvent =
  | { type: "snapshot"; snapshot: DashboardSnapshot; todayStart: number }
  | { type: "push"; message: Record<string, unknown>; now: number }
  | { type: "idle"; sessionId: string }
  | { type: "prune"; now: number };

export function initialActivityState(todayStart = startOfLocalDay(Date.now())): UserActivityState {
  return {
    loaded: false,
    machineStatus: "offline",
    workspaces: {},
    recentSessions: [],
    sessionsToday: 0,
    todayStart,
    generating: {},
    activity: [],
    desiredOrigin: {},
  };
}

export function startOfLocalDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function activityTime(session: Pick<ChatSessionDto, "lastMessageAt" | "createdAt">): number {
  return Date.parse(session.lastMessageAt ?? session.createdAt) || 0;
}

function snippet(message: ChatMessageDto): string | null {
  const text = message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH - 1)}…` : text;
}

function addEntries(state: UserActivityState, entries: ActivityEntry[]): UserActivityState {
  if (entries.length === 0) return state;
  // `entries` are in occurrence order; the feed is newest first.
  const activity = [...[...entries].reverse(), ...state.activity].slice(0, ACTIVITY_LIMIT);
  return { ...state, activity };
}

function entry(
  base: { id: string; now: number },
  fields: Partial<Omit<ActivityEntry, "id" | "at">> & { kind: ActivityKind },
): ActivityEntry {
  return {
    id: base.id,
    at: base.now,
    origin: null,
    workspaceId: null,
    sessionId: null,
    detail: null,
    text: null,
    ...fields,
  };
}

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const { [key]: _removed, ...rest } = record;
  return rest;
}

function upsertRecent(
  state: UserActivityState,
  session: ChatSessionDto,
): { recentSessions: DashboardSession[]; previous: DashboardSession | undefined } {
  const previous = state.recentSessions.find((s) => s.id === session.id);
  const workspacePath =
    state.workspaces[session.workspaceId]?.path ?? previous?.workspacePath ?? "";
  const next: DashboardSession = { ...session, workspacePath };
  const rest = state.recentSessions.filter((s) => s.id !== session.id);
  const recentSessions = [next, ...rest]
    .sort((a, b) => activityTime(b) - activityTime(a))
    .slice(0, RECENT_SESSIONS_LIMIT);
  return { recentSessions, previous };
}

/** Message activity moved a known session into "today". */
function crossedIntoToday(
  state: UserActivityState,
  previous: DashboardSession | undefined,
  session: ChatSessionDto,
): boolean {
  if (!previous) return false;
  return (
    activityTime(previous) < state.todayStart &&
    activityTime(session) >= state.todayStart
  );
}

function adjustSessionCount(
  state: UserActivityState,
  workspaceId: string,
  delta: number,
): Record<string, DashboardWorkspace> {
  const workspace = state.workspaces[workspaceId];
  if (!workspace) return state.workspaces;
  return {
    ...state.workspaces,
    [workspaceId]: {
      ...workspace,
      sessionCount: Math.max(0, workspace.sessionCount + delta),
    },
  };
}

function applyDaemonStatus(
  state: UserActivityState,
  workspaceId: string,
  status: DashboardWorkspace["daemonStatus"],
  base: { id: string; now: number },
): UserActivityState {
  const workspace = state.workspaces[workspaceId];
  if (!workspace || workspace.daemonStatus === status) return state;
  const desired = state.desiredOrigin[workspaceId];
  const origin =
    desired && base.now - desired.at <= DESIRED_ORIGIN_WINDOW_MS ? desired.origin : null;
  return addEntries(
    {
      ...state,
      workspaces: { ...state.workspaces, [workspaceId]: { ...workspace, daemonStatus: status } },
    },
    [entry(base, { kind: "daemon", workspaceId, detail: status, origin })],
  );
}

export function reduceActivity(state: UserActivityState, event: ActivityEvent): UserActivityState {
  switch (event.type) {
    case "snapshot": {
      const { snapshot } = event;
      return {
        ...state,
        loaded: true,
        machineStatus: snapshot.machineStatus,
        workspaces: Object.fromEntries(snapshot.workspaces.map((w) => [w.id, w])),
        recentSessions: [...snapshot.recentSessions]
          .sort((a, b) => activityTime(b) - activityTime(a))
          .slice(0, RECENT_SESSIONS_LIMIT),
        sessionsToday: snapshot.sessionsToday,
        todayStart: event.todayStart,
      };
    }

    case "idle":
      return state.generating[event.sessionId]
        ? { ...state, generating: withoutKey(state.generating, event.sessionId) }
        : state;

    case "prune": {
      const stale = Object.values(state.generating).filter(
        (g) => event.now - g.updatedAt > GENERATING_TTL_MS,
      );
      if (stale.length === 0) return state;
      let generating = state.generating;
      for (const g of stale) generating = withoutKey(generating, g.sessionId);
      return { ...state, generating };
    }

    case "push":
      return reducePush(state, event.message, event.now);
  }
}

function reducePush(
  state: UserActivityState,
  message: Record<string, unknown>,
  now: number,
): UserActivityState {
  const type = message.type;

  if (type === "machine.presence") {
    const parsed = machinePresencePushSchema.safeParse(message);
    if (!parsed.success) return state;
    const status = parsed.data.data.status;
    if (state.machineStatus === status) return state;
    return addEntries(
      { ...state, machineStatus: status },
      [entry({ id: parsed.data.eventId, now }, { kind: "machine", detail: status })],
    );
  }

  if (type === "workspace.updated") {
    const parsed = workspaceUpdatedPushSchema.safeParse(message);
    if (!parsed.success) return state;
    const { data, origin, eventId } = parsed.data;
    const previous = state.workspaces[data.workspace.id];
    const next: DashboardWorkspace = {
      ...data.workspace,
      // Daemon status flips go through `applyDaemonStatus` so they land in the feed once.
      daemonStatus: previous?.daemonStatus ?? data.daemonStatus,
      connections: data.connections,
      sessionCount: previous?.sessionCount ?? 0,
    };
    let result: UserActivityState = {
      ...state,
      workspaces: { ...state.workspaces, [next.id]: next },
    };
    if (data.reason === "daemon.desired") {
      result = {
        ...result,
        desiredOrigin: { ...result.desiredOrigin, [next.id]: { origin: origin ?? null, at: now } },
      };
    }
    if (previous) {
      result = applyDaemonStatus(result, next.id, data.daemonStatus, { id: eventId, now });
    }
    if (data.reason === "bind" && origin === "tui") {
      result = addEntries(result, [
        entry({ id: eventId, now }, { kind: "workspace", workspaceId: next.id, origin, detail: "bind" }),
      ]);
    }
    return result;
  }

  if (type === "connection.status") {
    const parsed = connectionStatusPushSchema.safeParse(message);
    if (!parsed.success) return state;
    const { data, eventId } = parsed.data;
    const workspace = state.workspaces[data.workspaceId];
    // Unknown workspace: `workspace.updated` follows a TUI bind with the full row.
    if (!workspace) return state;
    const updated: DashboardWorkspace = {
      ...workspace,
      connections: data.connections,
      ...(data.daemonDesired ? { daemonDesired: data.daemonDesired } : {}),
    };
    return applyDaemonStatus(
      { ...state, workspaces: { ...state.workspaces, [workspace.id]: updated } },
      workspace.id,
      data.daemon,
      { id: eventId, now },
    );
  }

  if (type === "daemon.presence") {
    const parsed = daemonPresencePushSchema.safeParse(message);
    if (!parsed.success) return state;
    const { data, eventId } = parsed.data;
    return applyDaemonStatus(state, data.workspaceId, data.status, { id: eventId, now });
  }

  if (type === "session.updated") {
    const parsed = sessionUpdatedPushSchema.safeParse(message);
    if (!parsed.success) return state;
    const { data: session, origin, change, changed, eventId } = parsed.data;
    const { recentSessions, previous } = upsertRecent(state, session);
    let result: UserActivityState = { ...state, recentSessions };
    const entries: ActivityEntry[] = [];
    const base = { origin: origin ?? null, workspaceId: session.workspaceId, sessionId: session.id };

    if (change === "created") {
      result = {
        ...result,
        workspaces: adjustSessionCount(result, session.workspaceId, 1),
        sessionsToday:
          Date.parse(session.createdAt) >= state.todayStart
            ? state.sessionsToday + 1
            : state.sessionsToday,
      };
      entries.push(entry({ id: eventId, now }, { ...base, kind: "session.created", text: session.title }));
    } else if (change === "settings") {
      if (changed?.includes("mode")) {
        entries.push(
          entry({ id: `${eventId}:mode`, now }, { ...base, kind: "session.mode", detail: session.mode, text: session.title }),
        );
      }
      if (changed?.includes("model") || changed?.includes("provider")) {
        entries.push(
          entry({ id: `${eventId}:model`, now }, { ...base, kind: "session.model", detail: session.model, text: session.title }),
        );
      }
    } else {
      // "message" (or an older server): the turn is persisted, generation is over.
      result = {
        ...result,
        generating: withoutKey(result.generating, session.id),
        sessionsToday: crossedIntoToday(state, previous, session)
          ? state.sessionsToday + 1
          : state.sessionsToday,
      };
    }
    return addEntries(result, entries);
  }

  if (type === "session.deleted") {
    const parsed = sessionDeletedPushSchema.safeParse(message);
    if (!parsed.success) return state;
    const { data, origin, eventId } = parsed.data;
    const known = state.recentSessions.find((s) => s.id === data.chatSessionId);
    const result: UserActivityState = {
      ...state,
      recentSessions: state.recentSessions.filter((s) => s.id !== data.chatSessionId),
      workspaces: adjustSessionCount(state, data.workspaceId, -1),
      generating: withoutKey(state.generating, data.chatSessionId),
    };
    return addEntries(result, [
      entry(
        { id: eventId, now },
        {
          kind: "session.deleted",
          origin: origin ?? null,
          workspaceId: data.workspaceId,
          sessionId: data.chatSessionId,
          text: known?.title ?? null,
        },
      ),
    ]);
  }

  if (type === "session.message.created") {
    const parsed = sessionMessageCreatedPushSchema.safeParse(message);
    if (!parsed.success) return state;
    const { data, origin, eventId } = parsed.data;
    const { recentSessions, previous } = upsertRecent(state, data.session);
    const isUser = data.message.role === "user";
    const previousGenerating = state.generating[data.session.id];
    const generating =
      data.message.role === "user"
        ? {
            ...state.generating,
            [data.session.id]: previousGenerating ?? {
              sessionId: data.session.id,
              workspaceId: data.workspaceId,
              phase: "waiting" as const,
              startedAt: now,
              updatedAt: now,
              toolName: null,
            },
          }
        : data.message.role === "assistant"
          ? withoutKey(state.generating, data.session.id)
          : state.generating;
    const detail =
      data.message.role === "assistant" && data.message.status === "error"
        ? "assistant-error"
        : data.message.role;
    return addEntries(
      {
        ...state,
        recentSessions,
        generating,
        sessionsToday:
          isUser && crossedIntoToday(state, previous, data.session)
            ? state.sessionsToday + 1
            : state.sessionsToday,
      },
      [
        entry(
          { id: eventId, now },
          {
            kind: "message",
            origin: origin ?? null,
            workspaceId: data.workspaceId,
            sessionId: data.session.id,
            detail,
            text: data.message.role === "assistant" && data.message.status === "error"
              ? data.message.error
              : snippet(data.message),
          },
        ),
      ],
    );
  }

  if (type === "chat.generate.progress") {
    const parsed = chatGenerateProgressPushSchema.safeParse(message);
    if (!parsed.success) return state;
    const { data } = parsed.data;
    const previous = state.generating[data.sessionId];
    const runningTool = data.toolCall?.status === "running" ? data.toolCall.name : null;
    return {
      ...state,
      generating: {
        ...state.generating,
        [data.sessionId]: {
          sessionId: data.sessionId,
          workspaceId: data.workspaceId,
          phase: data.phase,
          startedAt: previous?.startedAt ?? now,
          updatedAt: now,
          toolName:
            data.phase === "tool" ? (runningTool ?? previous?.toolName ?? null) : null,
        },
      },
    };
  }

  return state;
}

/** Workspaces with the daemon up, most recently active first. */
export function liveWorkspaces(state: UserActivityState): DashboardWorkspace[] {
  return sortWorkspaces(Object.values(state.workspaces)).filter((w) => w.daemonStatus === "online");
}

export function sortWorkspaces<T extends { lastActiveAt: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt));
}

/** Sessions generating right now, oldest first (stable for the "En vivo" list). */
export function generatingList(state: UserActivityState): GeneratingSession[] {
  return Object.values(state.generating).sort((a, b) => a.startedAt - b.startedAt);
}

export function generatingCountFor(state: UserActivityState, workspaceId: string): number {
  return Object.values(state.generating).filter((g) => g.workspaceId === workspaceId).length;
}

export type ClientCounts = { tui: number; web: number };

/** TUI / web clients attached to a workspace (daemons and hosts are not clients). */
export function clientCounts(workspace: DashboardWorkspace): ClientCounts {
  const counts: ClientCounts = { tui: 0, web: 0 };
  for (const c of workspace.connections) {
    if (c.clientKind !== "client") continue;
    if (c.clientLabel === "tui") counts.tui += 1;
    else if (c.clientLabel === "web") counts.web += 1;
  }
  return counts;
}

export const ORIGIN_LABEL: Record<PushOrigin, string> = {
  tui: "TUI",
  web: "Web",
  api: "API",
};

/** One-line Spanish description of an activity entry (workspace label resolved by the caller). */
export function describeActivity(item: ActivityEntry, workspaceLabel: string | null): string {
  const where = workspaceLabel ? ` · ${workspaceLabel}` : "";
  switch (item.kind) {
    case "message":
      if (item.detail === "user") return `Mensaje enviado${where}`;
      if (item.detail === "assistant-error") return `El agente respondió con error${where}`;
      return `Respuesta del agente${where}`;
    case "session.created":
      return `Sesión creada${where}`;
    case "session.deleted":
      return `Sesión eliminada${where}`;
    case "session.mode":
      return `Modo ${item.detail === "build" ? "Build" : "Plan"}${where}`;
    case "session.model":
      return `Modelo ${item.detail ?? ""}${where}`.trim();
    case "daemon":
      if (item.detail === "online") return `Daemon online${where}`;
      if (item.detail === "stale") return `Daemon sin latido${where}`;
      return `Daemon apagado${where}`;
    case "machine":
      return item.detail === "online" ? "PC online" : "PC offline";
    case "workspace":
      return `Workspace abierto${where}`;
  }
}
