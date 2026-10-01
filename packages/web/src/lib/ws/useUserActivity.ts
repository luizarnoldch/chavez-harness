"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getDashboard } from "../api";
import { initialActivityState } from "../../features/dashboard/activity";
import { browserDeps } from "./browser-deps";
import {
  acquireUserActivity,
  type UserActivityStore,
  type UserActivityView,
} from "./user-activity";

const IDLE: UserActivityView = {
  ...initialActivityState(0),
  live: "connecting",
  error: null,
};
const noopSubscribe = () => () => undefined;
const idleView = () => IDLE;

/**
 * Live view of the user's workspaces / sessions / activity (dashboard, rail badges,
 * workspace list). The first caller on a page opens the user-level socket.
 */
export function useUserActivity(): UserActivityView & { store: UserActivityStore | null } {
  const [store, setStore] = useState<UserActivityStore | null>(null);

  useEffect(() => {
    const acquired = acquireUserActivity({
      socket: browserDeps,
      store: { fetchSnapshot: (since) => getDashboard(since) },
    });
    setStore(acquired.store);
    return () => {
      acquired.release();
    };
  }, []);

  const view = useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.getView : idleView,
    idleView,
  );
  return { ...view, store };
}
