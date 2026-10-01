import type {
  ChatMessageDto,
  ChatSessionDto,
  ChatSessionWithMessagesDto,
  ConnectableProvider,
  DashboardSnapshot,
  ProviderCredentialStatus,
  WorkspaceConnection,
  WorkspaceDto,
} from "@chavez-harness/shared";
import { apiUrl } from "./env";

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  // Labels REST actions so their pushes carry `origin: "web"` instead of `api`.
  headers.set("x-chavez-client", "web");
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
    const detail = body.message ?? body.error;
    if (detail) return detail;
  } catch {
    // non-JSON body
  }
  return `${fallback} (${response.status})`;
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

/** Cross-workspace snapshot; `since` (ISO) is the start of "today" for the session counter. */
export async function getDashboard(since?: string): Promise<DashboardSnapshot> {
  const query = since ? `?since=${encodeURIComponent(since)}` : "";
  const response = await apiFetch(`/api/dashboard${query}`);
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo cargar el panel"));
  }
  return (await response.json()) as DashboardSnapshot;
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

export async function createSession(
  workspaceId: string,
  input: {
    title?: string;
    mode?: "plan" | "build";
    provider?: string;
    model?: string;
  } = {},
): Promise<ChatSessionDto> {
  const response = await apiFetch(`/api/workspaces/${workspaceId}/sessions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo crear la sesión"));
  }
  return (await response.json()) as ChatSessionDto;
}

export async function updateSession(
  sessionId: string,
  patch: {
    mode?: "plan" | "build";
    provider?: string;
    model?: string;
    title?: string | null;
  },
): Promise<{ session: ChatSessionDto; changed: Array<"mode" | "provider" | "model" | "title"> }> {
  const response = await apiFetch(`/api/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo actualizar la sesión"));
  }
  return (await response.json()) as {
    session: ChatSessionDto;
    changed: Array<"mode" | "provider" | "model" | "title">;
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await apiFetch(`/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo eliminar la sesión"));
  }
}

export async function getSessionWithMessages(
  sessionId: string,
  afterSeq?: number,
): Promise<ChatSessionWithMessagesDto> {
  const path =
    afterSeq !== undefined
      ? `/api/sessions/${sessionId}?afterSeq=${encodeURIComponent(String(afterSeq))}`
      : `/api/sessions/${sessionId}`;
  const response = await apiFetch(path);
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

export async function listProviderCredentials(): Promise<ProviderCredentialStatus[]> {
  const response = await apiFetch("/api/providers");
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudieron cargar los proveedores"));
  }
  const body = (await response.json()) as { providers: ProviderCredentialStatus[] };
  return body.providers;
}

export async function upsertProviderCredential(
  provider: ConnectableProvider,
  apiKey: string,
): Promise<ProviderCredentialStatus> {
  const response = await apiFetch(`/api/providers/${provider}/credentials`, {
    method: "PUT",
    body: JSON.stringify({ apiKey }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "No se pudo guardar la credencial"));
  }
  return (await response.json()) as ProviderCredentialStatus;
}
