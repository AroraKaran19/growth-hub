"use client";

import { useMemo } from "react";
import { useIsClient, useStoredItem } from "@/utils/storage";

export type Session = {
  name: string;
  method: "phone" | "google";
  phone?: string;
  email?: string;
  signedInAt: string;
};

const STORAGE_KEY = "growth-hub:session";

const parseSession = (raw: string | null): Session | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Session;
    return value && typeof value.name === "string" ? value : null;
  } catch {
    return null;
  }
};

/** MOCK member sign-in, kept in this browser until the auth API exists. */
export const useSession = () => {
  const [saved, write] = useStoredItem(STORAGE_KEY);
  const isReady = useIsClient();
  const session = useMemo(() => parseSession(saved), [saved]);

  return {
    session,
    /** False on the server and during hydration, so guards wait for it. */
    isReady,
    signIn: (next: Session) => write(JSON.stringify(next)),
    signOut: () => write(null),
  };
};
