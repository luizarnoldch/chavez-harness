import type { WorkspaceSyncData } from "@chavez-harness/shared";
import type { ChavezWsClientOptions } from "../ws-client";

/** Badge semantics from docs/ops-realtime-sync.md (local to this tab). */
export type SocketLive = "connecting" | "live" | "offline";

export type SocketSnapshot = {
  live: SocketLive;
  error: string | null;
  /** Last `workspace.sync` reply (presence snapshot after every (re)bind). */
  sync: WorkspaceSyncData | null;
  /** Successful (re)opens so far; consumers re-fetch their REST snapshot when it changes. */
  openCount: number;
};

export type PushMessage = Record<string, unknown> & { type?: unknown; data?: unknown };
export type PushListener = (message: PushMessage) => void;

/** The subset of ChavezWsClient the shared socket needs (fakeable in tests). */
export type WsClientLike = {
  connect(): Promise<void>;
  request<T = unknown>(type: string, payload?: Record<string, unknown>): Promise<T>;
  close(): void;
};

export type WorkspaceTarget = {
  workspaceId: string;
  /** Path sent on `workspace.bind` (the server resolves the workspace by path). */
  path: string;
};

export type SharedSocketConfig = {
  /** Omit both for a user-level socket (dashboard, rail badges). */
  workspaceId?: string | null;
  path?: string | null;
  chatSessionId?: string | null;
};

export type SharedSocketDeps = {
  createClient: (options: ChavezWsClientOptions) => WsClientLike;
  /** Make sure `?token=` is available before opening the socket. */
  ensureToken: () => Promise<unknown>;
};

/** Listen to every push regardless of type. */
export const ANY_PUSH = "*";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function targetOf(config: SharedSocketConfig): WorkspaceTarget | null {
  return config.workspaceId && config.path
    ? { workspaceId: config.workspaceId, path: config.path }
    : null;
}

/**
 * One WebSocket per page: connect → `user.subscribe` (every event of the user) →
 * `workspace.bind` (`clientLabel: "web"`) + `workspace.sync` when the page has a workspace,
 * on every open. Pushes fan out to subscribers by type.
 */
export class SharedSocket {
  private client: WsClientLike | null = null;
  private readonly listeners = new Map<string, Set<PushListener>>();
  private readonly stateListeners = new Set<() => void>();
  private snapshot: SocketSnapshot = {
    live: "connecting",
    error: null,
    sync: null,
    openCount: 0,
  };
  private workspace: WorkspaceTarget | null;
  private chatSessionId: string | null;
  private started = false;
  private stopped = false;

  constructor(
    config: SharedSocketConfig,
    private readonly deps: SharedSocketDeps,
  ) {
    this.workspace = targetOf(config);
    this.chatSessionId = config.chatSessionId ?? null;
  }

  /** Bound workspace, or null for a user-only socket. */
  get workspaceId(): string | null {
    return this.workspace?.workspaceId ?? null;
  }

  get target(): WorkspaceTarget | null {
    return this.workspace;
  }

  getSnapshot = (): SocketSnapshot => this.snapshot;

  subscribeState = (listener: () => void): (() => void) => {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  };

  /** Subscribe to pushes of one `type` (or `ANY_PUSH`). Returns the unsubscribe. */
  on(type: string, listener: PushListener): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  /** Sent on the next (re)sync; the server only echoes it back today. */
  setChatSessionId(chatSessionId: string | null | undefined) {
    if (chatSessionId) this.chatSessionId = chatSessionId;
  }

  /**
   * Attach a workspace to a user-level socket (the page learned its workspace after
   * the socket was already up). Binds right away when the socket is open.
   */
  bindWorkspace(target: WorkspaceTarget) {
    if (this.stopped) return;
    if (this.workspace) return;
    this.workspace = target;
    // While (re)opening, onOpen reads `workspace` after `user.subscribe`.
    if (this.client && this.snapshot.live === "live") {
      void this.bindAndSync(this.client).catch((err) => {
        if (!this.stopped) {
          this.patch({ error: errorMessage(err, "No se pudo sincronizar en vivo") });
        }
      });
    }
  }

  request<T = unknown>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
    if (!this.client || this.stopped) {
      return Promise.reject(new Error("WebSocket no conectado"));
    }
    return this.client.request<T>(type, payload);
  }

  start() {
    if (this.started) return;
    this.started = true;

    const client = this.deps.createClient({
      autoReconnect: true,
      onClose: () => {
        if (!this.stopped) this.patch({ live: "connecting" });
      },
      onOpen: async ({ reconnect }) => {
        try {
          await client.request("user.subscribe");
          if (this.workspace) await this.bindAndSync(client);
          if (!this.stopped) {
            this.patch({
              live: "live",
              error: null,
              openCount: this.snapshot.openCount + 1,
            });
          }
        } catch (err) {
          if (!this.stopped) {
            this.patch({
              live: "offline",
              error: errorMessage(err, "No se pudo sincronizar en vivo"),
            });
          }
          if (!reconnect) throw err;
          console.error("[ws] resubscribe failed", err);
        }
      },
      onPush: (message) => this.dispatch(message),
    });
    this.client = client;

    void (async () => {
      try {
        await this.deps.ensureToken();
        if (this.stopped) return;
        await client.connect();
      } catch (err) {
        if (!this.stopped) {
          this.patch({
            live: "offline",
            error: errorMessage(err, "No se pudo conectar al WebSocket"),
          });
        }
      }
    })();
  }

  stop() {
    this.stopped = true;
    this.client?.close();
    this.client = null;
    this.listeners.clear();
    this.stateListeners.clear();
  }

  private async bindAndSync(client: WsClientLike) {
    const target = this.workspace;
    if (!target) return;
    await client.request("workspace.bind", {
      path: target.path,
      clientKind: "client",
      clientLabel: "web",
    });
    const sync = await client.request<WorkspaceSyncData>("workspace.sync", {
      workspaceId: target.workspaceId,
      ...(this.chatSessionId ? { chatSessionId: this.chatSessionId } : {}),
    });
    if (!this.stopped) this.patch({ sync });
  }

  private dispatch(message: PushMessage) {
    const type = typeof message.type === "string" ? message.type : null;
    const targets = [
      ...(type ? (this.listeners.get(type) ?? []) : []),
      ...(this.listeners.get(ANY_PUSH) ?? []),
    ];
    for (const listener of targets) {
      try {
        listener(message);
      } catch (err) {
        console.error("[ws] push listener failed", err);
      }
    }
  }

  private patch(partial: Partial<SocketSnapshot>) {
    this.snapshot = { ...this.snapshot, ...partial };
    for (const listener of this.stateListeners) listener();
  }
}

type RegistryEntry = { socket: SharedSocket; refs: number; keys: Set<string> };

const registry = new Map<string, RegistryEntry>();

const USER_KEY = "user";

function workspaceKey(target: WorkspaceTarget): string {
  return `${target.workspaceId}\u0000${target.path}`;
}

function addKey(entry: RegistryEntry, key: string) {
  entry.keys.add(key);
  registry.set(key, entry);
}

/**
 * Ref-counted access, one socket per page:
 * - a user-level request (`{}`) reuses whatever socket the page already has;
 * - a workspace request reuses the socket bound to that workspace, or attaches the
 *   workspace to the page's user-level socket, or opens a new one;
 * - a page never binds two different workspaces on one socket (second one gets its own).
 * The last `release()` closes the socket.
 */
export function acquireSharedSocket(
  config: SharedSocketConfig,
  deps: SharedSocketDeps,
): { socket: SharedSocket; release: () => void } {
  const target = targetOf(config);
  let entry: RegistryEntry | undefined;

  if (target) {
    entry = registry.get(workspaceKey(target));
    if (!entry) {
      const userEntry = registry.get(USER_KEY);
      if (userEntry && !userEntry.socket.target) {
        userEntry.socket.bindWorkspace(target);
        addKey(userEntry, workspaceKey(target));
        entry = userEntry;
      }
    }
  } else {
    entry = registry.get(USER_KEY);
  }

  if (entry) {
    entry.refs += 1;
    entry.socket.setChatSessionId(config.chatSessionId);
  } else {
    const socket = new SharedSocket({ ...config }, deps);
    entry = { socket, refs: 1, keys: new Set() };
    addKey(entry, target ? workspaceKey(target) : USER_KEY);
    // Pages with a workspace also answer user-level requests.
    if (target && !registry.has(USER_KEY)) addKey(entry, USER_KEY);
    socket.start();
  }

  const acquired = entry;
  let released = false;
  return {
    socket: acquired.socket,
    release: () => {
      if (released) return;
      released = true;
      acquired.refs -= 1;
      if (acquired.refs <= 0) {
        acquired.socket.stop();
        for (const key of acquired.keys) {
          if (registry.get(key) === acquired) registry.delete(key);
        }
      }
    },
  };
}

/** Test helper: number of live sockets in the registry. */
export function sharedSocketCount(): number {
  return new Set(registry.values()).size;
}
