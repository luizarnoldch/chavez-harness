import type { AppMode } from "../components/StatusBar";

export type UserTurn = {
  id: string;
  role: "user";
  text: string;
  mode: AppMode;
};

export type AssistantTurn = {
  id: string;
  role: "assistant";
  text: string;
  model: string;
  status: "done" | "error";
  error?: string;
};

export type Turn = UserTurn | AssistantTurn;

export type Session = {
  id: string;
  turns: Turn[];
};

const sessions = new Map<string, Session>();

function nextId(): string {
  return crypto.randomUUID();
}

export function createSession(): Session {
  const session: Session = { id: nextId(), turns: [] };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function appendUserTurn(
  sessionId: string,
  input: { text: string; mode: AppMode },
): UserTurn {
  const session = requireSession(sessionId);
  const turn: UserTurn = {
    id: nextId(),
    role: "user",
    text: input.text,
    mode: input.mode,
  };
  session.turns.push(turn);
  return turn;
}

export function appendAssistantTurn(
  sessionId: string,
  input: { text: string; model: string; status: "done" | "error"; error?: string },
): AssistantTurn {
  const session = requireSession(sessionId);
  const turn: AssistantTurn = {
    id: nextId(),
    role: "assistant",
    text: input.text,
    model: input.model,
    status: input.status,
    ...(input.error ? { error: input.error } : {}),
  };
  session.turns.push(turn);
  return turn;
}

export function resetSessions(): void {
  sessions.clear();
}

export function shortSessionId(id: string): string {
  return id.slice(0, 8);
}

function requireSession(sessionId: string): Session {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error("Sesión no encontrada");
  }
  return session;
}
