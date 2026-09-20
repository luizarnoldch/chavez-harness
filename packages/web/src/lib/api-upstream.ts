/** Upstream API for Astro/Vite reverse proxy (server-side only). */
export function getApiInternalUrl(): string {
  return (
    import.meta.env.API_INTERNAL_URL ??
    process.env.API_INTERNAL_URL ??
    "http://localhost:28001"
  );
}
