import {
  clearCredentials,
  defaultApiUrl,
  loadCredentials,
  saveCredentials,
  type Credentials,
} from "./credentials.ts";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

function extractSessionToken(response: Response): string | null {
  const headerToken = response.headers.get("set-auth-token");
  if (headerToken) return headerToken;

  const setCookie = response.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookie) {
    const match = cookie.match(/(?:^|,\s*)better-auth\.session_token=([^;]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  const single = response.headers.get("set-cookie");
  if (single) {
    const match = single.match(/better-auth\.session_token=([^;]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return null;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  credentials?: Credentials | null,
): Promise<Response> {
  const creds = credentials ?? (await loadCredentials());
  const apiUrl = creds?.apiUrl ?? defaultApiUrl();
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  if (creds?.sessionToken) {
    headers.set("authorization", `Bearer ${creds.sessionToken}`);
  }
  return fetch(new URL(path, apiUrl), { ...init, headers });
}

async function parseAuthError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  const cause =
    err.cause instanceof Error ? err.cause.message.toLowerCase() : "";
  const haystack = `${msg} ${cause}`;
  return (
    haystack.includes("unable to connect") ||
    haystack.includes("fetch failed") ||
    haystack.includes("econnrefused") ||
    haystack.includes("connection refused") ||
    haystack.includes("access the url")
  );
}

function rethrowAuthNetworkError(err: unknown, apiUrl: string): never {
  if (isNetworkError(err)) {
    throw new Error(`No se pudo conectar a ${apiUrl}. ¿Está el server arriba?`);
  }
  throw err;
}

async function credentialsFromAuthResponse(
  response: Response,
  apiUrl: string,
  email: string,
  failLabel: string,
): Promise<Credentials> {
  if (!response.ok) {
    throw new Error(await parseAuthError(response, `${failLabel} (${response.status})`));
  }

  const token = extractSessionToken(response);
  if (!token) {
    throw new Error("El servidor no devolvió un token de sesión");
  }

  const credentials: Credentials = { apiUrl, sessionToken: token, email };
  await saveCredentials(credentials);
  return credentials;
}

export async function signIn(
  email: string,
  password: string,
  apiUrl = defaultApiUrl(),
): Promise<Credentials> {
  let response: Response;
  try {
    response = await fetch(new URL("/api/auth/sign-in/email", apiUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    rethrowAuthNetworkError(err, apiUrl);
  }

  return credentialsFromAuthResponse(response, apiUrl, email, "Login falló");
}

export async function signUp(
  input: { name: string; email: string; password: string },
  apiUrl = defaultApiUrl(),
): Promise<Credentials> {
  let response: Response;
  try {
    response = await fetch(new URL("/api/auth/sign-up/email", apiUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        password: input.password,
      }),
    });
  } catch (err) {
    rethrowAuthNetworkError(err, apiUrl);
  }

  return credentialsFromAuthResponse(
    response,
    apiUrl,
    input.email,
    "Registro falló",
  );
}

export async function getSession(
  credentials?: Credentials | null,
): Promise<SessionUser | null> {
  const creds = credentials ?? (await loadCredentials());
  if (!creds?.sessionToken) return null;

  const response = await apiFetch("/api/auth/get-session", { method: "GET" }, creds);
  if (response.status === 401) return null;
  if (!response.ok) return null;

  const body = (await response.json()) as {
    user?: { id: string; email: string; name: string };
    session?: unknown;
  } | null;

  if (!body?.user) return null;
  return {
    id: body.user.id,
    email: body.user.email,
    name: body.user.name,
  };
}

export async function signOut(): Promise<void> {
  const creds = await loadCredentials();
  if (creds) {
    try {
      await apiFetch("/api/auth/sign-out", { method: "POST" }, creds);
    } catch {
      // still clear local credentials
    }
  }
  await clearCredentials();
}
