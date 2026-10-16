"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { CircleCheck, Mail, Phone } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { readApiError } from "@/libs/api/errors";
import { fetchRefunds, markRefunded, type RefundDue } from "@/libs/api/venueRemoval";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import { rupees } from "./payoutRules";

const KIND_LABELS = { booking: "Pass", membership: "Membership", "addon-order": "Add-ons" } as const;

const RefundCard = ({ refund, onDone }: { refund: RefundDue; onDone: () => Promise<unknown> }) => {
  const [amount, setAmount] = useState(refund.suggested === null ? "" : String(refund.suggested / 100));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const paise = Math.round(Number(amount) * 100);
    if (!amount.trim() || !(paise >= 0)) return setError("Enter the amount refunded, or 0 for none.");
    setIsSaving(true);
    setError(null);
    try {
      await markRefunded(refund.id, { amount: paise, note: note.trim() });
      await onDone();
    } catch (caught) {
      const info = readApiError(caught);
      setError(Object.values(info.fields)[0] ?? info.message);
      setIsSaving(false);
    }
  };

  return (
    <li className="rounded-2xl border border-tertiary/10 bg-secondary p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-tertiary">{refund.member.name}</p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tertiary/60">
            <span className="inline-flex items-center gap-1">
              <Phone aria-hidden="true" className="size-3" />
              {refund.member.phone}
            </span>
            {refund.member.email && (
              <span className="inline-flex items-center gap-1">
                <Mail aria-hidden="true" className="size-3" />
                {refund.member.email}
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-tertiary/55">Paid</p>
          <p className="text-lg font-bold text-tertiary">{rupees(refund.paid)}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-tertiary/75">
        {KIND_LABELS[refund.kind]} {refund.ref} at {refund.venueName}, cancelled {formatDay(refund.createdAt.slice(0, 10))}
      </p>
      <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-900">{refund.reason}</p>

      {refund.status === "refunded" ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-green-800">
          <CircleCheck aria-hidden="true" className="size-4" />
          Refunded {rupees(refund.refundedAmount ?? 0)} by {refund.refundedBy}. {refund.refundNote}
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-4 flex flex-wrap items-end gap-2 border-t border-tertiary/8 pt-4">
          <label className="w-32">
            <span className="mb-1 block text-xs font-medium text-tertiary/70">
              Refund (₹)
              <RequiredMark />
              {refund.suggested === null && <span className="text-tertiary/45"> you decide</span>}
            </span>
            <input
              inputMode="decimal"
              aria-required="true"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
              className="w-full rounded-lg border border-tertiary/15 bg-secondary px-3 py-2 text-sm text-tertiary outline-none focus-visible:border-primary"
            />
          </label>
          <label className="min-w-48 grow">
            <span className="mb-1 block text-xs font-medium text-tertiary/70">
              How it was refunded
              <RequiredMark />
            </span>
            <input
              aria-required="true"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Razorpay refund id or bank reference"
              className="w-full rounded-lg border border-tertiary/15 bg-secondary px-3 py-2 text-sm text-tertiary outline-none placeholder:text-tertiary/40 focus-visible:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={isSaving}
            className="cta-gradient rounded-lg px-4 py-2 text-sm font-semibold text-secondary shadow-sm disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Mark refunded"}
          </button>
          {error && <p role="alert" className="basis-full text-xs text-primary">{error}</p>}
        </form>
      )}
    </li>
  );
};

/** Refunds Growth Hub owes members because their venue was removed. */
const RefundsPanel = ({ onChanged }: { onChanged: () => Promise<unknown> }) => {
  const [tab, setTab] = useState<"due" | "refunded">("due");
  const { data, error, isLoading, mutate } = useSWR(["admin/refunds", tab], () => fetchRefunds(tab));
  const refunds = data ?? [];

  return (
    <div className="mt-5">
      <div className="inline-flex rounded-lg border border-tertiary/10 bg-secondary p-0.5 text-sm">
        {(["due", "refunded"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className={cn("rounded-md px-3 py-1.5 font-medium", tab === value ? "bg-tertiary text-secondary" : "text-tertiary/65")}
          >
            {value === "due" ? "To refund" : "Refunded"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-tertiary/4" />
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-primary">{readApiError(error).message}</p>
      ) : refunds.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-tertiary/10 bg-secondary px-6 py-12 text-center text-sm text-tertiary/60">
          {tab === "due" ? "No refunds waiting. They appear here when a venue with live bookings or plans is deleted." : "No refunds recorded yet."}
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {refunds.map((refund) => (
            <RefundCard key={refund.id} refund={refund} onDone={() => Promise.all([mutate(), onChanged()])} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default RefundsPanel;
