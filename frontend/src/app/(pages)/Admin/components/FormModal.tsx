"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type FormModalProps = { label: string; onClose: () => void; children: ReactNode };

/** Hosts an existing form card as a dialog; the card keeps its own header and styling. */
const FormModal = ({ label, onClose, children }: FormModalProps) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tertiary/50 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-xl animate-[fade-up_0.2s_ease-out_both] overflow-y-auto rounded-2xl shadow-2xl motion-reduce:animate-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-tertiary/50 transition-colors hover:bg-tertiary/5 hover:text-tertiary"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        {children}
      </div>
    </div>
  );
};

export default FormModal;
