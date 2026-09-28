/** RFC1918 + link-local IPv4 hostnames (no brackets; IPv6 link-local omitted). */
export function isPrivateNetworkHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "127.0.0.1" || host.startsWith("127.")) return true;

  const parts = host.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

export function parseTrustedOriginsCsv(csv: string | undefined): string[] {
  if (!csv?.trim()) return [];
  const out: string[] = [];
  for (const part of csv.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      out.push(new URL(trimmed).origin);
    } catch {
      // skip invalid entries
    }
  }
  return out;
}

export function dedupeOrigins(origins: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const origin of origins) {
    if (seen.has(origin)) continue;
    seen.add(origin);
    out.push(origin);
  }
  return out;
}

export type AllowedWebOriginOptions = {
  trustedOrigins: readonly string[];
  webUrl: string;
  allowPrivateNetworkOrigins: boolean;
};

/**
 * Whether a browser Origin may call the API (CORS / better-auth).
 * Empty origin (curl, CLI Bearer) is allowed.
 */
export function isAllowedWebOrigin(
  origin: string | undefined,
  options: AllowedWebOriginOptions,
): boolean {
  if (!origin) return true;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  const normalized = parsed.origin;
  if (options.trustedOrigins.includes(normalized)) return true;

  if (!options.allowPrivateNetworkOrigins) return false;
  if (parsed.protocol !== "http:") return false;
  if (!isPrivateNetworkHostname(parsed.hostname)) return false;

  let web: URL;
  try {
    web = new URL(options.webUrl);
  } catch {
    return false;
  }
  const webPort = web.port || (web.protocol === "https:" ? "443" : "80");
  const originPort = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  return originPort === webPort;
}
