import { useSyncExternalStore } from "react";

/** Same convention as `harness:theme`; the inline script in Layout.astro reads it before paint. */
export const RAIL_STORAGE_KEY = "harness:rail";

export type RailMode = "expanded" | "collapsed";

/** The mode lives on `<html data-rail>` so CSS (and the first paint) agree with React. */
function currentRailMode(): RailMode {
  if (typeof document === "undefined") return "expanded";
  return document.documentElement.dataset.rail === "collapsed" ? "collapsed" : "expanded";
}

const listeners = new Set<() => void>();

export function setRailMode(mode: RailMode) {
  try {
    if (mode === "collapsed") localStorage.setItem(RAIL_STORAGE_KEY, "collapsed");
    else localStorage.removeItem(RAIL_STORAGE_KEY);
  } catch {
    // private mode: still applies to this page
  }
  if (mode === "collapsed") document.documentElement.dataset.rail = "collapsed";
  else delete document.documentElement.dataset.rail;
  for (const listener of listeners) listener();
}

export function toggleRail() {
  setRailMode(currentRailMode() === "collapsed" ? "expanded" : "collapsed");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRailCollapsed(): boolean {
  return (
    useSyncExternalStore(subscribe, currentRailMode, () => "expanded" as RailMode) === "collapsed"
  );
}
