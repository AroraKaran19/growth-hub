"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type RecordDrawerProps = {
  title: string;
  subtitle: ReactNode;
  badge?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

/** Right-hand panel for one booking or membership; the page stays visible behind it. */
const RecordDrawer = ({ title, subtitle, badge, onClose, children }: RecordDrawerProps) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-tertiary/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-drawer-title"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-surface shadow-2xl"
      >
        <header className="relative overflow-hidden bg-tertiary px-6 py-5 text-secondary">
          <div aria-hidden="true" className="cta-banner absolute -right-16 -top-20 size-56 rounded-full opacity-30 blur-3xl" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-1 text-secondary/60 transition-colors hover:text-secondary"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <div className="relative flex flex-wrap items-center gap-2 pr-8">
            <h2 id="record-drawer-title" className="text-xl font-bold">
              {title}
            </h2>
            {badge}
          </div>
          <div className="relative mt-1 text-sm text-secondary/70">{subtitle}</div>
        </header>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      </aside>
    </div>
  );
};

export default RecordDrawer;
