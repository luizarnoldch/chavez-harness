import { useSyncExternalStore } from "react";

/** `matchMedia` as React state; `false` during SSR. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Same breakpoint as the rail (`desk:` in global.css). */
export const DESKTOP_QUERY = "(min-width: 900px)";
