"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, X } from "lucide-react";
import { readApiError } from "@/libs/api/errors";
import { CUSTOMER_REASONS, REASON_LABELS, type CustomerReason } from "@/types/cancellation";
import { cn } from "@/utils";

const MAX_DETAILS = 500;

type CancelRequestModalProps = {
  /** "Pass GH-0004521" or "Membership GH-M-0004521", shown in the header. */
  subject: string;
  venueName: string;
  onClose: () => void;
  onSubmit: (input: { reason: CustomerReason; details: string }) => Promise<unknown>;
};

/** Sends a cancellation request; the venue decides and refunds directly. */
const CancelRequestModal = ({ subject, venueName, onClose, onSubmit }: CancelRequestModalProps) => {
  const [reason, setReason] = useState<CustomerReason | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = async () => {
    if (!reason) return setError("Pick the reason that fits best.");
    if (reason === "other" && !details.trim()) return setError("Tell the venue a little about why.");
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit({ reason, details: details.trim() });
    } catch (caught) {
      setError(readApiError(caught).message);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tertiary/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-request-title"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-secondary shadow-2xl"
      >
        <div className="relative overflow-hidden bg-tertiary px-6 py-5 text-secondary">
          <div aria-hidden="true" className="cta-banner absolute -right-12 -top-16 size-44 rounded-full opacity-30 blur-3xl" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-1 text-secondary/60 transition-colors hover:text-secondary"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <p className="relative flex items-center gap-2 text-sm text-secondary/70">
            <MessageSquareText aria-hidden="true" className="size-4" />
            {subject}
          </p>
          <h2 id="cancel-request-title" className="relative mt-1 text-xl font-bold">
            Ask {venueName} to cancel
          </h2>
          <p className="relative mt-1 text-sm text-secondary/70">
            The venue decides, and if it agrees it refunds you directly. Nothing changes until then.
          </p>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <fieldset>
            <legend className="text-sm font-medium text-tertiary">Why do you want to cancel?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {CUSTOMER_REASONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={reason === option}
                  onClick={() => {
                    setReason(option);
                    setError(null);
                  }}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-sm transition-colors",
                    reason === option
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-tertiary/15 text-tertiary/75 hover:border-tertiary/35",
                  )}
                >
                  {REASON_LABELS[option]}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="cancel-details" className="text-sm font-medium text-tertiary">
              Anything the venue should know {reason === "other" ? "" : "(optional)"}
            </label>
            <textarea
              id="cancel-details"
              value={details}
              maxLength={MAX_DETAILS}
              rows={3}
              onChange={(event) => {
                setDetails(event.target.value);
                setError(null);
              }}
              placeholder="A few words help the venue decide"
              className="mt-2 w-full resize-none rounded-lg border border-tertiary/15 bg-secondary px-3 py-2.5 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
            />
            <p className="mt-1 text-right text-xs text-tertiary/45">
              {details.length}/{MAX_DETAILS}
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-primary/8 px-3 py-2 text-sm text-primary">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-4">
            <button type="button" onClick={onClose} className="text-sm font-medium text-tertiary/70 hover:text-tertiary">
              Keep it
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isSaving}
              className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSaving ? "Sending..." : "Send request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelRequestModal;
