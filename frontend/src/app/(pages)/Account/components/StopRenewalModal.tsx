"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ApiMembership } from "@/types/membership";
import { formatDay } from "@/utils/date";

type StopRenewalModalProps = {
  membership: ApiMembership;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  errorFor: (caught: unknown) => string;
};

const StopRenewalModal = ({ membership, onCancel, onConfirm, errorFor }: StopRenewalModalProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const confirm = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onConfirm();
    } catch (caught) {
      setError(errorFor(caught));
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tertiary/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="stop-renewal-title"
        className="relative w-full max-w-md rounded-2xl bg-secondary p-6 shadow-xl sm:p-8"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-tertiary/50 transition-colors hover:text-tertiary"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        <h2 id="stop-renewal-title" className="text-xl font-bold text-tertiary">
          Stop renewing?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-tertiary/65">
          Your plan at {membership.venue.name} will not be charged again. Your seat stays reserved until{" "}
          <span className="font-medium text-tertiary">
            {membership.paidThrough ? formatDay(membership.paidThrough) : "the end of the paid period"}
          </span>
          , then the plan ends.
        </p>
        <p className="mt-3 rounded-lg bg-tertiary/4 px-3 py-2 text-xs text-tertiary/60">
          This can&apos;t be undone. To keep your seat after that, buy a new plan.
        </p>

        {error && (
          <p role="alert" className="mt-3 text-sm text-primary">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
          >
            Keep renewing
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={isSaving}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-secondary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSaving ? "Stopping..." : "Stop renewing"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StopRenewalModal;
