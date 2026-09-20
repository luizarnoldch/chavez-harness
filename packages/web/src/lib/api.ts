import type {
  ChatMessageDto,
  ChatSessionDto,
  ChatSessionWithMessagesDto,
  WorkspaceConnection,
  WorkspaceDto,
} from "@chavez-harness/shared";
import { apiUrl } from "./env";

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  return fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
}

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function listWorkspaces(): Promise<WorkspaceDto[]> {
  const response = await apiFetch("/api/workspaces");
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudieron cargar los workspaces"));
  }
  const body = (await response.json()) as { workspaces: WorkspaceDto[] };
  return body.workspaces;
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceDto> {
  const response = await apiFetch(`/api/workspaces/${workspaceId}`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Workspace no encontrado"));
  }
  return (await response.json()) as WorkspaceDto;
}

export async function getWorkspaceConnections(workspaceId: string): Promise<{
  daemon: "online" | "offline" | "stale";
  daemonDesired: "on" | "off";
  daemonDesiredSource: "tui" | "web" | null;
  machineStatus: "online" | "offline";
  connections: WorkspaceConnection[];
}> {
  const response = await apiFetch(`/api/workspaces/${workspaceId}/connections`);
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudieron cargar las conexiones"));
  }
  return (await response.json()) as {
    daemon: "online" | "offline" | "stale";
    daemonDesired: "on" | "off";
    daemonDesiredSource: "tui" | "web" | null;
    machineStatus: "online" | "offline";
    connections: WorkspaceConnection[];
  };
}

export async function getMachineStatus(): Promise<{
  status: "online" | "offline";
  machineId: string | null;
  hostname: string | null;
}> {
  const response = await apiFetch("/api/machine");
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo consultar el estado de la máquina"));
  }
  return (await response.json()) as {
    status: "online" | "offline";
    machineId: string | null;
    hostname: string | null;
  };
}

export async function setWorkspaceDaemon(
  workspaceId: string,
  desired: "on" | "off",
  source: "web" | "tui" = "web",
): Promise<{
  workspace: WorkspaceDto;
  daemonStatus: "online" | "offline" | "stale";
  ignored: boolean;
  machineStatus: "online" | "offline";
}> {
  const response = await apiFetch(`/api/workspaces/${workspaceId}/daemon`, {
    method: "POST",
    body: JSON.stringify({ desired, source }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo controlar el daemon"));
  }
  return (await response.json()) as {
    workspace: WorkspaceDto;
    daemonStatus: "online" | "offline" | "stale";
    ignored: boolean;
    machineStatus: "online" | "offline";
  };
}

export async function listSessions(workspaceId: string): Promise<ChatSessionDto[]> {
  const response = await apiFetch(`/api/workspaces/${workspaceId}/sessions`);
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudieron cargar las sesiones"));
  }
  const body = (await response.json()) as { sessions: ChatSessionDto[] };
  return body.sessions;
}

export async function getSessionWithMessages(
  sessionId: string,
  afterSeq?: number,
): Promise<ChatSessionWithMessagesDto> {
  const path =
    afterSeq !== undefined
      ? `/api/sessions/${sessionId}?afterSeq=${encodeURIComponent(String(afterSeq))}`
      : `/api/sessions/${sessionId}`;
  const response = await fetch(apiUrl(path), { credentials: "include" });
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo cargar la sesión"));
  }
  return (await response.json()) as ChatSessionWithMessagesDto;
}

export async function sendMessage(
  sessionId: string,
  input: {
    text: string;
    mode: "plan" | "build";
    provider?: string;
    model?: string;
    clientMessageId?: string;
  },
): Promise<{
  session: ChatSessionDto;
  userMessage: ChatMessageDto;
  assistantMessage: ChatMessageDto;
  created: boolean;
}> {
  const response = await apiFetch(`/api/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo enviar el mensaje"));
  }
  return (await response.json()) as {
    session: ChatSessionDto;
    userMessage: ChatMessageDto;
    assistantMessage: ChatMessageDto;
    created: boolean;
  };
}
