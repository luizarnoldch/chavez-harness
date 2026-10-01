import type {
  ChatMessageDto,
  ChatSessionDto,
  ChatSessionWithMessagesDto,
} from "@chavez-harness/shared";
import { WorkspaceBridge, compareSessionsForList } from "../bridge.ts";
import type { ChavezWsClientOptions, WsClientLike } from "../ws/client.ts";

export const WS_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

export type Req = Record<string, any> & { id: string; type: string };
type Reply = { ok: boolean; data?: unknown; error?: string };

export function makeSession(id: string, patch: Partial<ChatSessionDto> = {}): ChatSessionDto {
  const now = new Date().toISOString();
  return {
    id,
    workspaceId: WS_ID,
    title: null,
    mode: "plan",
    provider: "cursor",
    model: "auto",
    createdAt: now,
    updatedAt: now,
    lastMessageAt: null,
    ...patch,
  };
}

export function makeMessage(
  sessionId: string,
  seq: number,
  role: "user" | "assistant",
  text: string,
): ChatMessageDto {
  return {
    id: crypto.randomUUID(),
    chatSessionId: sessionId,
    role,
    mode: "plan",
    provider: "cursor",
    model: "auto",
    status: "done",
    error: null,
    parts: [{ type: "text", text }],
    usage: null,
    clientMessageId: null,
    seq,
    createdAt: new Date().toISOString(),
  };
}

export const SESSION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const SESSION_B = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

/**
 * In-memory stand-in for the server side of the WS protocol, wired to a real `WorkspaceBridge`
 * through an injected client. `requests` records everything the bridge sent.
 */
export function createFakeServer() {
  const sessions = new Map<string, ChatSessionDto>();
  const messages = new Map<string, ChatMessageDto[]>();
  const requests: Req[] = [];
  let options!: ChavezWsClientOptions;
  /** Optional hook to run before a reply is returned (e.g. push an echo first). */
  const beforeReply: Record<string, (req: Req) => void> = {};

  function addSession(session: ChatSessionDto, msgs: ChatMessageDto[] = []) {
    sessions.set(session.id, session);
    messages.set(session.id, msgs);
  }

  function handle(req: Req): Reply {
    beforeReply[req.type]?.(req);
    switch (req.type) {
      case "workspace.bind":
        return {
          ok: true,
          data: {
            workspaceId: WS_ID,
            path: req.path,
            clientKind: "client",
            ...(req.clientLabel ? { clientLabel: req.clientLabel } : {}),
          },
        };
      case "workspace.sync":
        return {
          ok: true,
          data: { daemonStatus: "online", machineStatus: "online", chatSessionId: null },
        };
      case "workspace.daemon.set":
        return { ok: true, data: { daemonStatus: "online" } };
      case "session.list":
        return {
          ok: true,
          data: { sessions: [...sessions.values()].sort(compareSessionsForList) },
        };
      case "session.open": {
        let id: string | undefined = req.chatSessionId;
        if (!id) {
          id = [...sessions.values()].sort(compareSessionsForList)[0]?.id;
          if (!id) {
            id = crypto.randomUUID();
            addSession(makeSession(id));
          }
        }
        const session = sessions.get(id);
        if (!session) return { ok: false, error: "Sesión no encontrada" };
        const all = messages.get(id) ?? [];
        // Copy: the bridge caches what it receives and must not alias the server's arrays.
        const tail = all.filter((m) => req.afterSeq == null || m.seq > req.afterSeq);
        const data: ChatSessionWithMessagesDto = { ...session, messages: tail };
        return { ok: true, data };
      }
      case "session.create": {
        const id = crypto.randomUUID();
        const session = makeSession(id, {
          ...(req.provider ? { provider: req.provider } : {}),
          ...(req.model ? { model: req.model } : {}),
        });
        addSession(session);
        return { ok: true, data: session };
      }
      case "session.update": {
        const session = sessions.get(req.chatSessionId);
        if (!session) return { ok: false, error: "Sesión no encontrada" };
        const changed: string[] = [];
        const next = { ...session };
        for (const key of ["mode", "provider", "model", "title"] as const) {
          if (req[key] !== undefined && req[key] !== session[key]) {
            (next as Record<string, unknown>)[key] = req[key];
            changed.push(key);
          }
        }
        sessions.set(session.id, next);
        return { ok: true, data: { session: next, changed } };
      }
      case "chat.send": {
        const session = sessions.get(req.chatSessionId);
        if (!session) return { ok: false, error: "Sesión no encontrada" };
        const list = messages.get(session.id) ?? [];
        const seq = (list.at(-1)?.seq ?? 0) + 1;
        const userMessage = makeMessage(session.id, seq, "user", req.text);
        const assistantMessage = makeMessage(session.id, seq + 1, "assistant", req.text);
        list.push(userMessage, assistantMessage);
        messages.set(session.id, list);
        const updated = { ...session, mode: req.mode, lastMessageAt: assistantMessage.createdAt };
        sessions.set(session.id, updated);
        return {
          ok: true,
          data: { session: updated, userMessage, assistantMessage, created: true },
        };
      }
      case "session.delete": {
        const session = sessions.get(req.chatSessionId);
        if (!session) return { ok: false, error: "Sesión no encontrada" };
        sessions.delete(session.id);
        messages.delete(session.id);
        return { ok: true, data: { workspaceId: WS_ID, chatSessionId: session.id } };
      }
      default:
        return { ok: true, data: {} };
    }
  }

  const client = {
    connect: async () => {
      await options.onOpen?.({ reconnect: false });
    },
    request: async (message: Req) => {
      requests.push(message);
      const reply = handle(message);
      return { type: message.type, id: message.id, ...reply };
    },
    close: () => {},
  } as unknown as WsClientLike;

  function newBridge(extra: ConstructorParameters<typeof WorkspaceBridge>[0] = {}) {
    return new WorkspaceBridge({
      createClient: (o) => {
        options = o;
        return client;
      },
      ensureHost: async () => ({ spawned: false, pid: null }),
      ...extra,
    });
  }

  return {
    sessions,
    messages,
    requests,
    beforeReply,
    addSession,
    newBridge,
    /** Server → client push (workspace-bound). */
    push: (message: Record<string, unknown>) => options.onPush?.({ push: true, eventId: "e", ...message }),
    /** Socket (re)opened. Resolves when the bridge finished its re-sync. */
    open: (reconnect: boolean) => options.onOpen?.({ reconnect }),
    drop: () => options.onClose?.(),
    types: (from = 0) => requests.slice(from).map((r) => r.type),
  };
}
