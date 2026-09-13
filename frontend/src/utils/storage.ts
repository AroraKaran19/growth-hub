"use client";

import { useCallback, useSyncExternalStore } from "react";

const CHANGE_EVENT = "growth-hub:storage";

// Takes over for a key once localStorage refuses a write (privacy mode, quota).
const fallback = new Map<string, string | null>();

export const readStoredItem = (key: string): string | null => {
  if (fallback.has(key)) return fallback.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStoredItem = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    fallback.delete(key);
  } catch {
    fallback.set(key, value);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
};

const subscribeToNothing = () => () => {};

/** False on the server and during hydration, true once in the browser. */
export const useIsClient = () =>
  useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

/**
 * A localStorage entry as state. Null on the server and during hydration, so
 * the first client render matches the prerendered HTML.
 */
export const useStoredItem = (key: string) => {
  const value = useSyncExternalStore(
    subscribe,
    () => readStoredItem(key),
    () => null,
  );

  const write = useCallback(
    (next: string | null) => writeStoredItem(key, next),
    [key],
  );

  return [value, write] as const;
};
