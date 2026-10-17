"use client";

import { useState } from "react";
import { CircleX } from "lucide-react";
import StaffModal, { MODAL_ERROR, MODAL_QUIET_ACTION } from "@/app/components/shared/StaffModal";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import SelectField from "@/app/components/ui/form/SelectField";
import { readApiError } from "@/libs/api/errors";
import { toastDone } from "@/libs/toast";
import { CUSTOMER_REASONS, REASON_LABELS, type CancellationReason } from "@/types/cancellation";
import type { PartnerMember } from "@/types/partner";
import { cn } from "@/utils";
import { refundPaise, rupees } from "../requestRules";

const REASONS: CancellationReason[] = ["venue-cancelled", ...CUSTOMER_REASONS];
const MAX_NOTE = 500;

type CancelMembershipModalProps = {
  member: PartnerMember;
  onCancel: (body: { reason: CancellationReason; refundAmount: number; note: string }) => Promise<unknown>;
  onClose: () => void;
};

/** The desk cancels a live membership outright, with the refund the venue pays. */
const CancelMembershipModal = ({ member, onCancel, onClose }: CancelMembershipModalProps) => {
  const [reason, setReason] = useState<CancellationReason>("venue-cancelled");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [cap, setCap] = useState(member.paidTotal);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const pick = (value: string) => {
    setAmount(value);
    setError(null);
  };

  const submit = async () => {
    const refund = refundPaise(amount, cap);
    if (refund.error) return setError(refund.error);
    setIsSaving(true);
    setError(null);
    try {
      await onCancel({ reason, refundAmount: refund.paise, note: note.trim() });
      toastDone("Membership cancelled. The member has been emailed.");
      onClose();
    } catch (caught) {
      const info = readApiError(caught);
      if (info.code === "REFUND_TOO_HIGH" && typeof info.meta.max === "number") setCap(info.meta.max);
      setError(info.fields.refundAmount ?? info.fields.note ?? info.message);
      setIsSaving(false);
    }
  };

  const chip = (isOn: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
      isOn ? "border-primary bg-primary/10 text-primary" : "border-tertiary/15 text-tertiary/75 hover:border-tertiary/35",
    );
  const typed = amount === "" ? null : refundPaise(amount, cap).paise;

  return (
    <StaffModal
      eyebrow={
        <>
          <CircleX aria-hidden="true" className="size-4 text-primary" />
          Membership {member.membershipId}
        </>
      }
      title="Cancel membership"
      description={`${member.memberName}, ${member.plan}. Paid ${rupees(member.paidTotal)} so far.`}
      onClose={onClose}
      footer={
        <>
          {error && (
            <p role="alert" className={MODAL_ERROR}>
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-5">
            <button type="button" onClick={onClose} className={MODAL_QUIET_ACTION}>
              Keep membership
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isSaving}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-secondary shadow-md shadow-primary/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Cancelling..." : "Cancel membership"}
            </button>
          </div>
        </>
      }
    >
      {member.hasOpenRequest ? (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
          The member already asked to cancel; this approves their request with the refund below.
        </p>
      ) : (
        <SelectField
          label="Reason"
          value={reason}
          onChange={(value) => setReason(value as CancellationReason)}
          options={REASONS.map((value) => ({ value, label: REASON_LABELS[value] }))}
          required
        />
      )}

      <div>
        <label htmlFor="cancel-refund" className="text-sm font-medium text-tertiary">
          Refund the venue will pay
          <RequiredMark />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-tertiary/55">₹</span>
            <input
              id="cancel-refund"
              inputMode="decimal"
              aria-required="true"
              aria-describedby="cancel-refund-cap"
              value={amount}
              onChange={(event) => pick(event.target.value)}
              placeholder="0"
              className="w-36 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-7 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
            />
          </div>
          {cap > 0 && (
            <button type="button" onClick={() => pick(String(cap / 100))} className={chip(typed === cap)}>
              Full {rupees(cap)}
            </button>
          )}
          <button type="button" onClick={() => pick("0")} className={chip(typed === 0)}>
            None
          </button>
        </div>
        <p id="cancel-refund-cap" className="mt-2 text-xs text-tertiary/55">
          Up to {rupees(cap)}. The venue pays it back to the member directly.
        </p>
      </div>

      <div>
        <label htmlFor="cancel-note" className="text-sm font-medium text-tertiary">
          Note for the member (optional)
        </label>
        <textarea
          id="cancel-note"
          value={note}
          maxLength={MAX_NOTE}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Why it was cancelled and what happens next"
          className="mt-2 w-full resize-none rounded-lg border border-tertiary/15 bg-secondary px-3 py-2.5 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
        />
      </div>
    </StaffModal>
  );
};

export default CancelMembershipModal;
