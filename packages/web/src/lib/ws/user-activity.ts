import type { DashboardSnapshot } from "@chavez-harness/shared";
import {
  initialActivityState,
  reduceActivity,
  startOfLocalDay,
  type ActivityEvent,
  type UserActivityState,
} from "../../features/dashboard/activity";
import {
  acquireSharedSocket,
  type SharedSocket,
  type SharedSocketDeps,
  type SocketLive,
} from "./shared-socket";

/** What consumers read: the pure state plus the socket's live badge. */
export type UserActivityView = UserActivityState & {
  live: SocketLive;
  /** Last snapshot or socket error (cleared on the next success). */
  error: string | null;
};

/** Pushes the store folds into its state (everything else on the socket is ignored). */
export const USER_ACTIVITY_PUSHES = [
  "machine.presence",
  "workspace.updated",
  "connection.status",
  "daemon.presence",
  "session.updated",
  "session.deleted",
  "session.message.created",
  "chat.generate.progress",
] as const;

const PRUNE_EVERY_MS = 10_000;

export type UserActivityStoreDeps = {
  fetchSnapshot: (sinceIso: string) => Promise<DashboardSnapshot>;
  now?: () => number;
};

/**
 * Client-side mirror of the user's workspaces, sessions and activity. Starts from
 * `GET /api/dashboard`, is kept current by the page socket's pushes and re-fetches the
 * snapshot after every (re)connect so nothing missed while offline sticks.
 */
export class UserActivityStore {
  private state: UserActivityState;
  private view: UserActivityView;
  private live: SocketLive = "connecting";
  private error: string | null = null;
  private socketError: string | null = null;
  private readonly listeners = new Set<() => void>();
  private refreshing = false;
  private dirty = false;
  private detach: (() => void) | null = null;

  constructor(private readonly deps: UserActivityStoreDeps) {
    this.state = initialActivityState(startOfLocalDay(this.now()));
    this.view = this.buildView();
  }

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  private buildView(): UserActivityView {
    return { ...this.state, live: this.live, error: this.error };
  }

  getView = (): UserActivityView => this.view;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private commit() {
    this.view = this.buildView();
    for (const listener of this.listeners) listener();
  }

  dispatch(event: ActivityEvent) {
    const next = reduceActivity(this.state, event);
    if (next === this.state) return;
    this.state = next;
    this.commit();
  }

  /** The caller learned a generation is over (e.g. its own `chat.send` reply). */
  markIdle(sessionId: string) {
    this.dispatch({ type: "idle", sessionId });
  }

  async refresh(): Promise<void> {
    if (this.refreshing) {
      this.dirty = true;
      return;
    }
    this.refreshing = true;
    try {
      do {
        this.dirty = false;
        const todayStart = startOfLocalDay(this.now());
        try {
          const snapshot = await this.deps.fetchSnapshot(new Date(todayStart).toISOString());
          this.error = null;
          this.dispatch({ type: "snapshot", snapshot, todayStart });
          this.commit();
        } catch (err) {
          this.error = err instanceof Error ? err.message : "No se pudo cargar el panel";
          this.commit();
        }
      } while (this.dirty);
    } finally {
      this.refreshing = false;
    }
  }

  /** Follow a socket: fold its pushes in and re-sync on every (re)open. */
  attach(socket: SharedSocket): () => void {
    this.detach?.();

    const offPushes = USER_ACTIVITY_PUSHES.map((type) =>
      socket.on(type, (message) => {
        if (this.refreshing) this.dirty = true;
        this.dispatch({ type: "push", message, now: this.now() });
      }),
    );

    let lastOpen = -1;
    const syncState = () => {
      const snap = socket.getSnapshot();
      if (snap.live !== this.live || (snap.error ?? null) !== this.socketError) {
        this.live = snap.live;
        this.socketError = snap.error;
        this.commit();
      }
      if (snap.live === "live" && snap.openCount !== lastOpen) {
        lastOpen = snap.openCount;
        void this.refresh();
      }
    };
    const offState = socket.subscribeState(syncState);
    syncState();

    const timer = setInterval(
      () => this.dispatch({ type: "prune", now: this.now() }),
      PRUNE_EVERY_MS,
    );

    const detach = () => {
      for (const off of offPushes) off();
      offState();
      clearInterval(timer);
      if (this.detach === detach) this.detach = null;
    };
    this.detach = detach;
    return detach;
  }
}

type Acquired = { store: UserActivityStore; release: () => void };

let current: { acquired: Acquired; refs: number } | null = null;

/**
 * Page-wide singleton (ref-counted like the socket): the first consumer opens the
 * user-level socket and starts the store, the last one tears both down.
 */
export function acquireUserActivity(deps: {
  socket: SharedSocketDeps;
  store: UserActivityStoreDeps;
}): Acquired {
  if (!current) {
    const store = new UserActivityStore(deps.store);
    const socketRef = acquireSharedSocket({}, deps.socket);
    const detach = store.attach(socketRef.socket);
    current = {
      refs: 0,
      acquired: {
        store,
        release: () => {
          detach();
          socketRef.release();
        },
      },
    };
  }

  const entry = current;
  entry.refs += 1;
  let released = false;
  return {
    store: entry.acquired.store,
    release: () => {
      if (released) return;
      released = true;
      entry.refs -= 1;
      if (entry.refs <= 0) {
        entry.acquired.release();
        if (current === entry) current = null;
      }
    },
  };
}

/**
 * Tell the page's store a generation is over without waiting for a push (the sender of a
 * `chat.send` never receives its own `session.updated`). No-op when no store is mounted.
 */
export function markSessionIdle(sessionId: string) {
  current?.acquired.store.markIdle(sessionId);
}
