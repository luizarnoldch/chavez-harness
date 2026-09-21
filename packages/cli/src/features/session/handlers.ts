import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import type { AppMode } from "../../lib/types/mode";
import { getWorkspaceBridge } from "../workspace/bridge";
import { DEFAULT_SESSION_MODEL, DEFAULT_SESSION_PROVIDER } from "./model";
import { sessionFromDto, type Session } from "./store";

export type ReplyResult = { ok: true } | { ok: false; error: string };

const NOT_FOUND = "Sesión no encontrada";

export function rootLoader() {
  return redirect("/session/new");
}

export async function newSessionLoader(): Promise<Session | null> {
  const bridge = getWorkspaceBridge();
  const state = bridge.getState();
  if (state.status === "disconnected" || !state.workspaceId) {
    return null;
  }
  if (state.chatSessionId) {
    const cached = bridge.getSession(state.chatSessionId);
    if (cached) return sessionFromDto(cached);
  }
  try {
    const opened = await bridge.openLatestOrCreate();
    return sessionFromDto(opened);
  } catch {
    return null;
  }
}

export async function sessionLoader({ params }: LoaderFunctionArgs): Promise<Session> {
  const bridge = getWorkspaceBridge();
  const id = params.id;
  if (!id) {
    throw new Response(NOT_FOUND, { status: 404, statusText: NOT_FOUND });
  }

  try {
    const opened = await bridge.openSession(id);
    return sessionFromDto(opened);
  } catch {
    throw new Response(NOT_FOUND, { status: 404, statusText: NOT_FOUND });
  }
}

export async function newSessionAction({ request }: ActionFunctionArgs) {
  const submission = await readSubmission(request);
  if (!submission) {
    return { ok: false as const, error: "Mensaje vacío" };
  }

  const bridge = getWorkspaceBridge();
  const session = await bridge.createSession();
  const result = await bridge.sendMessage({
    chatSessionId: session.id,
    text: submission.text,
    mode: submission.mode,
    model: submission.model,
    provider: submission.provider,
    clientMessageId: submission.clientMessageId,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error ?? "Error al enviar" };
  }

  return redirect(`/session/${session.id}`);
}

export async function sessionAction({ request, params }: ActionFunctionArgs): Promise<ReplyResult> {
  const sessionId = params.id;
  if (!sessionId) {
    throw new Response(NOT_FOUND, { status: 404, statusText: NOT_FOUND });
  }

  const submission = await readSubmission(request);
  if (!submission) {
    return { ok: false, error: "Mensaje vacío" };
  }

  const bridge = getWorkspaceBridge();
  const result = await bridge.sendMessage({
    chatSessionId: sessionId,
    text: submission.text,
    mode: submission.mode,
    model: submission.model,
    provider: submission.provider,
    clientMessageId: submission.clientMessageId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Error al enviar" };
  }
  return { ok: true };
}

async function readSubmission(
  request: Request,
): Promise<{
  text: string;
  mode: AppMode;
  model: string;
  provider: string;
  clientMessageId: string;
} | null> {
  const form = await request.formData();
  const text = String(form.get("text") ?? "").trim();
  if (!text) return null;
  const mode: AppMode = form.get("mode") === "build" ? "build" : "plan";
  const model = String(form.get("model") ?? "").trim() || DEFAULT_SESSION_MODEL;
  const provider =
    String(form.get("provider") ?? "").trim() || DEFAULT_SESSION_PROVIDER;
  const clientMessageId =
    String(form.get("clientMessageId") ?? "").trim() || crypto.randomUUID();
  return { text, mode, model, provider, clientMessageId };
}
