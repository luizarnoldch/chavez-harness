/** Last path segment ("/home/me/proj/" → "proj"). */
export function basename(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const idx = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return (idx >= 0 ? trimmed.slice(idx + 1) : trimmed) || path;
}

/** "~/…" for home paths so long paths stay readable. */
export function prettyPath(path: string): string {
  return path.replace(/^\/(?:home|Users)\/[^/]+/, "~");
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso),
    );
  } catch {
    return "";
  }
}

/** "hace 5 min", "hace 3 h", "hace 2 d"; falls back to a date after a week. */
export function formatAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "—";
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "—";
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 45) return "ahora";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return formatDateTime(iso);
}

/** 950 → "950", 12_340 → "12.3k", 2_500_000 → "2.5M". */
export function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${trimZero((n / 1000).toFixed(1))}k`;
  return `${trimZero((n / 1_000_000).toFixed(1))}M`;
}

/** 850 → "850 ms", 12_300 → "12.3 s", 65_000 → "1 min 5 s". */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${trimZero(seconds.toFixed(1))} s`;
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

/** Cents → "$0.0123" (sub-cent costs keep 4 decimals). */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars === 0) return "$0";
  if (dollars < 0.01) return `$${dollars.toFixed(4)}`;
  return `$${dollars.toFixed(dollars < 1 ? 3 : 2)}`;
}

function trimZero(value: string): string {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}
