export type BackoffOptions = {
  initialMs?: number;
  maxMs?: number;
  factor?: number;
};

export function createBackoff(options: BackoffOptions = {}) {
  const initialMs = options.initialMs ?? 500;
  const maxMs = options.maxMs ?? 15_000;
  const factor = options.factor ?? 1.8;
  let attempt = 0;

  return {
    reset() {
      attempt = 0;
    },
    nextDelayMs() {
      const delay = Math.min(maxMs, Math.round(initialMs * factor ** attempt));
      attempt += 1;
      return delay;
    },
  };
}
