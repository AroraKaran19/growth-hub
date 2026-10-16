"use client";

import { useEffect, useEffectEvent, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils";
import { QUIET } from "./venue/fields";

type FormModalProps = { label: string; onClose: () => void; children: ReactNode };

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const FIRST_FIELD = "input:not([disabled]):not([type='hidden']):not([type='file']), textarea:not([disabled])";
const EDITS = "form button[type='button'], [role='option']";

/** Hosts an existing form card as a dialog; the card keeps its own header and styling. */
const FormModal = ({ label, onClose, children }: FormModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const isTouched = useRef(false);
  const focusBeforeConfirm = useRef<HTMLElement | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmTitleId = useId();

  const requestClose = () => {
    if (!isTouched.current) return onClose();
    focusBeforeConfirm.current = document.activeElement as HTMLElement | null;
    setIsConfirming(true);
  };

  const keepEditing = () => {
    setIsConfirming(false);
    focusBeforeConfirm.current?.focus();
  };

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (event.key === "Escape") {
      // An open dropdown inside the form closes itself first.
      if (!isConfirming && dialog.querySelector("[aria-expanded='true']")) return;
      if (isConfirming) keepEditing();
      else requestClose();
      return;
    }
    if (event.key !== "Tab") return;
    const root = (isConfirming && confirmRef.current) || dialog;
    const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.getClientRects().length > 0);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!root.contains(active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FIRST_FIELD)?.focus();
    // Capture phase, so an open dropdown's Escape is seen before it closes.
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    document.addEventListener("keydown", listener, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", listener, true);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  const markTouched = () => {
    isTouched.current = true;
  };

  const markTouchedOnEdit = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest(EDITS)) markTouched();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tertiary/50 p-4 sm:items-center" onClick={requestClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-xl animate-[fade-up_0.2s_ease-out_both] flex-col rounded-2xl shadow-2xl motion-reduce:animate-none"
      >
        <div inert={isConfirming} onInput={markTouched} onClick={markTouchedOnEdit} className="min-h-0 flex-1 overflow-y-auto rounded-2xl">
          {children}
        </div>

        <button
          type="button"
          onClick={requestClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full bg-secondary/80 p-1.5 text-tertiary/50 backdrop-blur transition-colors hover:bg-tertiary/5 hover:text-tertiary"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        {isConfirming && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-tertiary/40 p-5 backdrop-blur-[2px]">
            <div
              ref={confirmRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={confirmTitleId}
              className="w-full max-w-sm animate-[fade-up_0.2s_ease-out_both] rounded-2xl bg-secondary p-5 shadow-2xl motion-reduce:animate-none"
            >
              <p id={confirmTitleId} className="text-base font-bold text-tertiary">
                Discard this form?
              </p>
              <p className="mt-1 text-sm text-tertiary/60">What you&apos;ve entered here won&apos;t be saved.</p>
              <div className="mt-5 flex items-center justify-end gap-5">
                <button type="button" onClick={onClose} className={cn(QUIET, "text-primary")}>
                  Discard
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={keepEditing}
                  className="cta-gradient rounded-lg px-4 py-2 text-sm font-medium text-secondary shadow-md shadow-primary/20 transition-opacity hover:opacity-90"
                >
                  Keep editing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormModal;
