"use client";

import { useAuthStore } from "./auth";

export type AdminSession = {
  email: string;
  name: string;
};

export const useAdminSession = () => {
  const status = useAuthStore("admin", (state) => state.status);
  const account = useAuthStore("admin", (state) => state.account);
  const signOut = useAuthStore("admin", (state) => state.signOut);

  const session: AdminSession | null = account
    ? { email: account.email, name: account.name }
    : null;

  return { session, account, isReady: status !== "loading", signOut };
};
