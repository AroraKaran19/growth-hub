"use client";

import { useEffect, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type Consequence = { icon: LucideIcon; text: ReactNode };

type UserConfirmDialogProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  consequences: Consequence[];
  confirmLabel: string;
  busyLabel: string;
  isSaving: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const UserConfirmDialog = ({ title, subtitle, icon: Icon, consequences, confirmLabel, busyLabel, isSaving, onConfirm, onClose }: UserConfirmDialogProps) => {
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
        aria-labelledby="user-confirm-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-secondary shadow-2xl"
      >
        <div className="relative flex items-center gap-3.5 overflow-hidden bg-tertiary px-6 py-5 text-secondary">
          <div aria-hidden="true" className="absolute -right-12 -top-16 size-40 rounded-full bg-primary/40 blur-3xl" />
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/90">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div className="relative min-w-0">
            <h2 id="user-confirm-title" className="text-lg font-bold">
              {title}
            </h2>
            <p className="truncate text-sm text-secondary/65">{subtitle}</p>
          </div>
        </div>

        <ul className="flex flex-col gap-3 p-6">
          {consequences.map(({ icon: Item, text }, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-tertiary/70">
                <Item aria-hidden="true" className="size-4" />
              </span>
              <span className="pt-1.5 text-sm text-tertiary/75">{text}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-4 border-t border-tertiary/8 px-6 py-4">
          <button type="button" onClick={onClose} className="text-sm font-medium text-tertiary/60 transition-opacity hover:opacity-75">
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            disabled={isSaving}
            onClick={onConfirm}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserConfirmDialog;
