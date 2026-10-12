"use client";

import { useEffect, type ReactNode } from "react";
import { BadgeIndianRupee, CalendarCheck, LogOut, UserX, type LucideIcon } from "lucide-react";
import type { UserRow } from "@/hooks/useUsers";

type DisableUserDialogProps = {
  user: UserRow;
  isSaving: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const Consequence = ({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) => (
  <li className="flex items-start gap-3">
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-tertiary/70">
      <Icon aria-hidden="true" className="size-4" />
    </span>
    <span className="pt-1.5 text-sm text-tertiary/75">{children}</span>
  </li>
);

const DisableUserDialog = ({ user, isSaving, onConfirm, onClose }: DisableUserDialogProps) => {
  const name = user.name ?? "This customer";
  const plans = user.activeMemberships;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tertiary/50 p-4 sm:items-center" onClick={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="disable-user-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-secondary shadow-2xl"
      >
        <div className="flex items-center gap-3.5 bg-tertiary px-6 py-5 text-secondary">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/90">
            <UserX aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="disable-user-title" className="text-lg font-bold">
              Disable {name}?
            </h2>
            <p className="truncate text-sm text-secondary/65">{user.email ?? user.phone}</p>
          </div>
        </div>

        <ul className="flex flex-col gap-3 p-6">
          <Consequence icon={LogOut}>They&apos;re signed out everywhere and can&apos;t sign in until you enable them again.</Consequence>
          {user.kind === "customer" && plans > 0 && (
            <Consequence icon={BadgeIndianRupee}>
              {plans === 1 ? "Their membership stops" : `Their ${plans} memberships stop`} renewing. No more auto-debits; they keep the seat until
              the paid period ends.
            </Consequence>
          )}
          {user.kind === "customer" && <Consequence icon={CalendarCheck}>Upcoming bookings stay as they are.</Consequence>}
        </ul>

        <div className="flex items-center justify-end gap-4 border-t border-tertiary/8 px-6 py-4">
          <button type="button" onClick={onClose} className="text-sm font-medium text-tertiary/60 transition-opacity hover:opacity-75">
            Keep active
          </button>
          <button
            type="button"
            autoFocus
            disabled={isSaving}
            onClick={onConfirm}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Disabling..." : "Disable"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisableUserDialog;
