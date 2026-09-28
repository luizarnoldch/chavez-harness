import { authClient } from "./auth-client";

const TOKEN_KEY = "chavez.sessionToken";
const AUTH_COOKIE = "better-auth.session_token";

export function storeSessionToken(token: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function readSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

function readAuthCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq);
    if (name !== AUTH_COOKIE && name !== `__Secure-${AUTH_COOKIE}`) continue;
    const raw = part.slice(eq + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

/**
 * Ensure sessionStorage has a Bearer-capable token for WS `?token=`.
 * REST can rely on httpOnly cookies; WS upgrade through proxies is more reliable with query token.
 */
export async function ensureSessionToken(): Promise<string | null> {
  const existing = readSessionToken();
  if (existing) return existing;

  try {
    const result = await authClient.getSession();
    const session = result.data?.session as { token?: string } | undefined;
    if (session?.token) {
      storeSessionToken(session.token);
      return session.token;
    }
  } catch {
    // fall through to cookie
  }

  const fromCookie = readAuthCookieToken();
  if (fromCookie) {
    // Signed cookie value may still work when injected as cookie by the server;
    // store for ?token= so resolveWsUserId can set Authorization + cookie.
    storeSessionToken(fromCookie);
    return fromCookie;
  }

  return null;
}
