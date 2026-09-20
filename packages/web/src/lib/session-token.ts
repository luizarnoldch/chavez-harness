const TOKEN_KEY = "chavez.sessionToken";

export function storeSessionToken(token: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function readSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}
