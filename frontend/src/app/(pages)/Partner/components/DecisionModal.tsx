"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleX, X } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { readApiError } from "@/libs/api/errors";
import { REASON_LABELS, type CancellationRequest, type Decision } from "@/types/cancellation";
import { cn } from "@/utils";
import { KIND_LABELS, refundPaise, rupees } from "../requestRules";

type DecisionModalProps = {
  request: CancellationRequest;
  mode: "approve" | "reject";
  onClose: () => void;
  onDecide: (decision: Decision) => Promise<unknown>;
};

const MAX_NOTE = 500;

/** Approve with a refund amount the venue will pay itself, or decline with a note. */
const DecisionModal = ({ request, mode, onClose, onDecide }: DecisionModalProps) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isApprove = mode === "approve";
  const presets = [
    { label: "Full", paise: request.paid },
    { label: "Half", paise: Math.round(request.paid / 200) * 100 },
    { label: "None", paise: 0 },
  ];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = async () => {
    let decision: Decision;
    if (isApprove) {
      const refund = refundPaise(amount, request.paid);
      if (refund.error) return setError(refund.error);
      decision = { decision: "approve", refundAmount: refund.paise, note: note.trim() };
    } else {
      if (!note.trim()) return setError("Tell the member why you're declining.");
      decision = { decision: "reject", note: note.trim() };
    }
    setIsSaving(true);
    setError(null);
    try {
      await onDecide(decision);
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
        aria-labelledby="decision-title"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-secondary shadow-2xl"
      >
        <div className="bg-tertiary px-6 py-5 text-secondary">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-1 text-secondary/60 transition-colors hover:text-secondary"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <p className="flex items-center gap-2 text-sm text-secondary/70">
            {isApprove ? (
              <CircleCheck aria-hidden="true" className="size-4 text-green-400" />
            ) : (
              <CircleX aria-hidden="true" className="size-4 text-primary" />
            )}
            {KIND_LABELS[request.kind]} {request.ref}
          </p>
          <h2 id="decision-title" className="mt-1 text-xl font-bold">
            {isApprove ? "Approve cancellation" : "Decline cancellation"}
          </h2>
          <p className="mt-1 text-sm text-secondary/70">
            {request.member.name} paid {rupees(request.paid)}. Reason: {REASON_LABELS[request.reason]}.
          </p>
        </div>

        <div className="flex flex-col gap-4 p-6">
          {isApprove && (
            <div>
              <label htmlFor="refund-amount" className="text-sm font-medium text-tertiary">
                Refund you will pay the member
                <RequiredMark />
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-tertiary/55">₹</span>
                  <input
                    id="refund-amount"
                    inputMode="decimal"
                    aria-required="true"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setError(null);
                    }}
                    placeholder="0"
                    className="w-36 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-7 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
                  />
                </div>
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setAmount(String(preset.paise / 100));
                      setError(null);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      amount !== "" && refundPaise(amount, request.paid).paise === preset.paise
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-tertiary/15 text-tertiary/75 hover:border-tertiary/35",
                    )}
                  >
                    {preset.label} {preset.paise > 0 && rupees(preset.paise)}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-tertiary/55">
                Growth Hub records this amount; the venue pays it back to the member directly.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="decision-note" className="text-sm font-medium text-tertiary">
              {isApprove ? "Note for the member (optional)" : "Why you're declining"}
              {!isApprove && <RequiredMark />}
            </label>
            <textarea
              id="decision-note"
              aria-required={!isApprove || undefined}
              value={note}
              maxLength={MAX_NOTE}
              rows={3}
              onChange={(event) => {
                setNote(event.target.value);
                setError(null);
              }}
              placeholder={isApprove ? "Anything the member should know" : "The member sees this note"}
              className="mt-2 w-full resize-none rounded-lg border border-tertiary/15 bg-secondary px-3 py-2.5 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-primary/8 px-3 py-2 text-sm text-primary">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-4">
            <button type="button" onClick={onClose} className="text-sm font-medium text-tertiary/70 hover:text-tertiary">
              Not now
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isSaving}
              className={cn(
                "rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60",
                isApprove ? "cta-gradient" : "bg-tertiary",
              )}
            >
              {isSaving ? "Saving..." : isApprove ? "Approve and cancel" : "Decline request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionModal;
