import { auth } from "../lib/auth/index.ts";

export type ResolveWsUserId = (request: Request) => Promise<string | null>;

const SESSION_COOKIE = "better-auth.session_token";

/**
 * Resolve the authenticated user for a WebSocket upgrade.
 * Accepts Better Auth cookie, `Authorization: Bearer <token>`, or `?token=`.
 */
export const resolveWsUserId: ResolveWsUserId = async (request) => {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const headers = new Headers(request.headers);

  const authHeader = headers.get("authorization");
  const bearerToken =
    authHeader && /^Bearer\s+/i.test(authHeader)
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : null;
  const token = bearerToken || queryToken;

  if (token) {
    if (!headers.get("authorization")) {
      headers.set("authorization", `Bearer ${token}`);
    }
    const cookie = headers.get("cookie") ?? "";
    if (!cookie.includes(SESSION_COOKIE)) {
      const joined = cookie ? `${cookie}; ${SESSION_COOKIE}=${token}` : `${SESSION_COOKIE}=${token}`;
      headers.set("cookie", joined);
    }
  }

  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? null;
};
