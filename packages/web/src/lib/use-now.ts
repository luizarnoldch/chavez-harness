"use client";

import { useEffect, useState } from "react";

/** Re-renders every `intervalMs` so relative times ("hace 5 min") stay fresh. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
