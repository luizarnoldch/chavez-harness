const DEFAULT_TIMEOUT_MS = 30_000;

type PendingEntry = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export function createPendingRegistry(defaultTimeoutMs = DEFAULT_TIMEOUT_MS) {
  const pending = new Map<string, PendingEntry>();

  return {
    wait<T = unknown>(requestId: string, timeoutMs = defaultTimeoutMs): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        if (pending.has(requestId)) {
          reject(new Error(`Duplicate pending requestId: ${requestId}`));
          return;
        }
        const timer = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error(`Timed out waiting for requestId: ${requestId}`));
        }, timeoutMs);
        pending.set(requestId, {
          resolve: (value) => resolve(value as T),
          reject,
          timer,
        });
      });
    },

    complete(requestId: string, value: unknown): boolean {
      const entry = pending.get(requestId);
      if (!entry) return false;
      clearTimeout(entry.timer);
      pending.delete(requestId);
      entry.resolve(value);
      return true;
    },

    fail(requestId: string, error: Error): boolean {
      const entry = pending.get(requestId);
      if (!entry) return false;
      clearTimeout(entry.timer);
      pending.delete(requestId);
      entry.reject(error);
      return true;
    },

    size() {
      return pending.size;
    },
  };
}

export type PendingRegistry = ReturnType<typeof createPendingRegistry>;
