"use client";

import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type StaffModalProps = {
  eyebrow: ReactNode;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
};

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const FIRST_FIELD = "[role='combobox'], input:not([disabled]), textarea:not([disabled])";

/** Popup for one staff action on a record; safe to open above a record drawer. */
const StaffModal = ({ eyebrow, title, description, onClose, children, footer }: StaffModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (event.key === "Escape") {
      // Marks the key as handled so a drawer underneath stays open.
      event.preventDefault();
      if (!dialog.querySelector("[aria-expanded='true']")) onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.getClientRects().length > 0);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!dialog.contains(active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    (dialog?.querySelector<HTMLElement>(FIRST_FIELD) ?? dialog)?.focus();
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    document.addEventListener("keydown", listener, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", listener, true);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tertiary/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92vh] w-full max-w-lg animate-[fade-up_0.2s_ease-out_both] flex-col overflow-hidden rounded-2xl bg-secondary shadow-2xl outline-none motion-reduce:animate-none"
      >
        <div className="relative shrink-0 overflow-hidden bg-tertiary px-6 py-5 text-secondary">
          <div aria-hidden="true" className="cta-banner absolute -right-12 -top-16 size-44 rounded-full opacity-30 blur-3xl" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-1 text-secondary/60 transition-colors hover:text-secondary"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <p className="relative flex items-center gap-2 pr-8 text-sm text-secondary/70">{eyebrow}</p>
          <h2 id={titleId} className="relative mt-1 pr-8 text-xl font-bold">
            {title}
          </h2>
          {description && <div className="relative mt-1 text-sm text-secondary/70">{description}</div>}
        </div>

        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-6">{children}</div>

        <div className="shrink-0 border-t border-tertiary/10 bg-surface px-6 py-4">{footer}</div>
      </div>
    </div>
  );
};

export const MODAL_QUIET_ACTION = "text-sm font-medium text-tertiary/70 transition-colors hover:text-tertiary";

export const MODAL_ERROR = "mb-3 rounded-lg bg-primary/8 px-3 py-2 text-sm text-primary";

export default StaffModal;
