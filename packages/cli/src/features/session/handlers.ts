import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import type { AppMode } from "../../lib/types/mode";
import { REPLY_ERROR_TEXT, mockReply } from "./mock-reply";
import { LOCAL_MODEL } from "./model";
import {
  appendAssistantTurn,
  appendUserTurn,
  createSession,
  getSession,
  type Session,
} from "./store";

export type ReplyResult = { ok: true } | { ok: false; error: string };

const NOT_FOUND = "Sesión no encontrada";

export function rootLoader() {
  return redirect("/session/new");
}

export function newSessionLoader(): null {
  return null;
}

export function sessionLoader({ params }: LoaderFunctionArgs): Session {
  const session = params.id ? getSession(params.id) : undefined;
  if (!session) {
    throw new Response(NOT_FOUND, { status: 404, statusText: NOT_FOUND });
  }
  return session;
}

export async function newSessionAction({ request }: ActionFunctionArgs) {
  const submission = await readSubmission(request);
  if (!submission) {
    return { ok: false as const, error: "Mensaje vacío" };
  }

  const session = createSession();
  await recordExchange(session.id, submission.text, submission.mode, submission.model);
  return redirect(`/session/${session.id}`);
}

export async function sessionAction({ request, params }: ActionFunctionArgs): Promise<ReplyResult> {
  const session = params.id ? getSession(params.id) : undefined;
  if (!session) {
    throw new Response(NOT_FOUND, { status: 404, statusText: NOT_FOUND });
  }

  const submission = await readSubmission(request);
  if (!submission) {
    return { ok: false, error: "Mensaje vacío" };
  }

  return recordExchange(session.id, submission.text, submission.mode, submission.model);
}

async function recordExchange(
  sessionId: string,
  text: string,
  mode: AppMode,
  model: string,
): Promise<ReplyResult> {
  appendUserTurn(sessionId, { text, mode });
  try {
    const reply = await mockReply(text);
    appendAssistantTurn(sessionId, { text: reply, model, status: "done" });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : REPLY_ERROR_TEXT;
    appendAssistantTurn(sessionId, { text: "", model, status: "error", error: message });
    return { ok: false, error: message };
  }
}

async function readSubmission(
  request: Request,
): Promise<{ text: string; mode: AppMode; model: string } | null> {
  const form = await request.formData();
  const text = String(form.get("text") ?? "").trim();
  if (!text) return null;
  const mode: AppMode = form.get("mode") === "build" ? "build" : "plan";
  const model = String(form.get("model") ?? "").trim() || LOCAL_MODEL;
  return { text, mode, model };
}
