"use client";

import type { ReactNode } from "react";
import { UserRound } from "lucide-react";
import { useSiteAccount } from "@/hooks/useSiteAccount";
import { cn } from "@/utils";

/** True while an admin or partner is signed in; bookings belong to customer accounts. */
export const useIsStaff = () => {
  const { account } = useSiteAccount();
  return Boolean(account && account.kind !== "member");
};

export const StaffBookingNote = ({ className }: { className?: string }) => (
  <p className={cn("flex items-start gap-2 text-sm text-tertiary/60", className)}>
    <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tertiary/45" />
    Signed in as staff. Bookings need a customer account.
  </p>
);

/** Booking calls to action, hidden from staff logins. */
const CustomerOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) =>
  useIsStaff() ? fallback : children;

export default CustomerOnly;
