"use client";

import { useMemo } from "react";
import { useIsClient, useStoredItem } from "@/utils/storage";

export type AdminSession = {
  email: string;
  name: string;
  signedInAt: string;
};

const SESSION_KEY = "growth-hub:admin-session";

const parseSession = (raw: string | null): AdminSession | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
};

/** MOCK admin sign-in, separate from member and partner sessions. */
export const useAdminSession = () => {
  const [saved, write] = useStoredItem(SESSION_KEY);
  const isReady = useIsClient();
  const session = useMemo(() => parseSession(saved), [saved]);

  return {
    session,
    isReady,
    signIn: (next: AdminSession) => write(JSON.stringify(next)),
    signOut: () => write(null),
  };
};
