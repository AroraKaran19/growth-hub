"use client";

import { useAuthStore } from "./auth";

export type Session = {
  name: string;
  phone?: string;
  email?: string;
};

/** The member account as the navbar, account pages and invoice expect it. */
export const useSession = () => {
  const status = useAuthStore("member", (state) => state.status);
  const account = useAuthStore("member", (state) => state.account);
  const signOut = useAuthStore("member", (state) => state.signOut);

  const phone = account ? `${account.phone.countryCode} ${account.phone.number}` : undefined;
  const session: Session | null = account
    ? { name: account.name ?? phone ?? "Member", phone, email: account.email ?? undefined }
    : null;

  return { session, account, isReady: status !== "loading", signOut };
};
