/**
 * Browser-facing API origin. Empty / same-origin by default (Astro proxies /api + /ws).
 * Set PUBLIC_API_URL only to bypass the proxy (cross-origin).
 */
export function getApiUrl(): string {
  const explicit = import.meta.env.PUBLIC_API_URL as string | undefined;
  if (explicit && explicit.length > 0) return explicit.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Resolve a path against the API origin (supports same-origin relative paths). */
export function apiUrl(path: string): string {
  const base = getApiUrl();
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
}
