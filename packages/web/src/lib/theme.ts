import { useSyncExternalStore } from "react";

/** Same key as the paperclip-clone mock; the inline script in Layout.astro reads it too. */
export const THEME_STORAGE_KEY = "harness:theme";

export type ThemeName = "light" | "dark";

function readStoredTheme(): ThemeName | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Explicit choice wins; otherwise follow the OS. */
export function resolveTheme(stored: ThemeName | null, systemDark: boolean): ThemeName {
  return stored ?? (systemDark ? "dark" : "light");
}

export function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function setTheme(theme: ThemeName) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // private mode: still apply for this page
  }
  applyTheme(theme);
}

export function toggleTheme() {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
}

function currentTheme(): ThemeName {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Observe <html class="dark"> so every island (Toaster, toggle, markdown)
 * agrees on the theme without sharing React state.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (!readStoredTheme()) applyTheme(resolveTheme(null, media.matches));
  };
  media.addEventListener("change", onSystem);

  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) applyTheme(resolveTheme(readStoredTheme(), prefersDark()));
  };
  window.addEventListener("storage", onStorage);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}

export function useResolvedTheme(): ThemeName {
  return useSyncExternalStore(subscribe, currentTheme, () => "light");
}
