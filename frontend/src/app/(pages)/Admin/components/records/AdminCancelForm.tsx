"use client";

import { useState } from "react";
import SelectField from "@/app/components/ui/form/SelectField";
import { cancelAsAdmin } from "@/libs/api/cancellations";
import { readApiError } from "@/libs/api/errors";
import { CUSTOMER_REASONS, REASON_LABELS, type CancellationReason, type RequestKind } from "@/types/cancellation";
import { refundPaise, rupees } from "../../../Partner/requestRules";

const REASONS: CancellationReason[] = ["venue-cancelled", ...CUSTOMER_REASONS];
const CANCEL_NOUNS: Record<RequestKind, string> = { booking: "booking", membership: "plan", "addon-order": "add-on order" };

type AdminCancelFormProps = {
  kind: RequestKind;
  recordRef: string;
  paid: number;
  /** An open request is decided by this, so the member's own reason is kept. */
  hasOpenRequest: boolean;
  onDone: () => Promise<unknown>;
};

/** Cancels outright with a reason, the refund the venue pays and a note for the member. */
const AdminCancelForm = ({ kind, recordRef, paid, hasOpenRequest, onDone }: AdminCancelFormProps) => {
  const [reason, setReason] = useState<CancellationReason>("venue-cancelled");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    const refund = refundPaise(amount, paid);
    if (refund.error) return setError(refund.error);
    setIsSaving(true);
    setError(null);
    try {
      await cancelAsAdmin(kind, recordRef, { reason, refundAmount: refund.paise, note: note.trim() });
      await onDone();
    } catch (caught) {
      setError(readApiError(caught).message);
    } finally {
      setIsSaving(false);
    }
  };

  const chip = "rounded-full border border-tertiary/15 px-3 py-1.5 text-xs font-medium text-tertiary/75 hover:border-tertiary/35";

  return (
    <div className="flex flex-col gap-4">
      {hasOpenRequest ? (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-900">
          The member already asked to cancel; this approves their request.
        </p>
      ) : (
        <SelectField
          label="Reason"
          value={reason}
          onChange={(value) => setReason(value as CancellationReason)}
          options={REASONS.map((value) => ({ value, label: REASON_LABELS[value] }))}
        />
      )}
      <div>
        <label htmlFor={`${kind}-refund`} className="text-sm font-medium text-tertiary">
          Refund the venue will pay
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-tertiary/55">₹</span>
            <input
              id={`${kind}-refund`}
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              placeholder="0"
              className="w-36 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-7 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
            />
          </div>
          <button type="button" onClick={() => setAmount(String(paid / 100))} className={chip}>
            Full {rupees(paid)}
          </button>
          <button type="button" onClick={() => setAmount("0")} className={chip}>
            None
          </button>
        </div>
      </div>
      <div>
        <label htmlFor={`${kind}-note`} className="text-sm font-medium text-tertiary">
          Note for the member
        </label>
        <textarea
          id={`${kind}-note`}
          value={note}
          maxLength={500}
          rows={2}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Why it was cancelled and what happens next"
          className="mt-2 w-full resize-none rounded-lg border border-tertiary/15 bg-secondary px-3 py-2.5 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-primary">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={isSaving}
        className="self-end rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isSaving ? "Cancelling..." : `Cancel this ${CANCEL_NOUNS[kind]}`}
      </button>
    </div>
  );
};

export default AdminCancelForm;
