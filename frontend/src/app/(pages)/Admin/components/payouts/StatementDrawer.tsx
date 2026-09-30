"use client";

import { useState, type FormEvent } from "react";
import { Download, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { useStatement } from "@/hooks/usePayouts";
import {
  addAdjustment,
  downloadStatement,
  generateStatements,
  issueStatement,
  markStatementPaid,
  removeAdjustment,
  unissueStatement,
} from "@/libs/api/payouts";
import { readApiError } from "@/libs/api/errors";
import { STATEMENT_STATUS_LABELS } from "@/types/payout";
import { cn } from "@/utils";
import { formatDay, todayIso } from "@/utils/date";
import RecordDrawer from "../records/RecordDrawer";
import BankDetailsCard from "./BankDetailsCard";
import StatementLines from "./StatementLines";
import { STATUS_STYLE, rupees } from "./payoutRules";

const INPUT =
  "w-full rounded-lg border border-tertiary/15 bg-secondary px-3 py-2 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 hover:border-tertiary/30 focus-visible:border-primary";

type StatementDrawerProps = { statementId: string; onClose: () => void; onChanged: () => Promise<unknown> };

/** One venue's statement for a month: its lines, adjustments and the issue and payment steps. */
const StatementDrawer = ({ statementId, onClose, onChanged }: StatementDrawerProps) => {
  const { statement, isLoading, mutate } = useStatement(statementId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState({ amount: "", note: "", isCredit: true });
  const [payment, setPayment] = useState({ utr: "", paidOn: todayIso(), note: "" });

  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await action();
      await Promise.all([mutate(), onChanged()]);
    } catch (caught) {
      const info = readApiError(caught);
      setError(Object.values(info.fields)[0] ?? info.message);
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || !statement) {
    return (
      <RecordDrawer title="Statement" subtitle="Loading..." onClose={onClose}>
        <div className="h-64 animate-pulse rounded-2xl bg-tertiary/5" />
      </RecordDrawer>
    );
  }

  const isDraft = statement.status === "draft";
  const submitAdjustment = (event: FormEvent) => {
    event.preventDefault();
    const paise = Math.round(Number(adjustment.amount) * 100);
    if (!(paise > 0)) return setError("Enter an amount above 0.");
    void run("adjust", async () => {
      await addAdjustment(statement.id, { amount: adjustment.isCredit ? paise : -paise, note: adjustment.note });
      setAdjustment({ amount: "", note: "", isCredit: true });
    });
  };
  const submitPayment = (event: FormEvent) => {
    event.preventDefault();
    void run("paid", () => markStatementPaid(statement.id, payment));
  };

  return (
    <RecordDrawer
      title={`${statement.venue.name}, ${statement.monthLabel}`}
      subtitle={`${statement.totals.lineCount} items, ${formatDay(statement.from)} to ${formatDay(statement.to)}`}
      badge={
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[statement.status])}>
          {STATEMENT_STATUS_LABELS[statement.status]}
        </span>
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        <div className="relative overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-lg">
          <div aria-hidden="true" className="cta-banner absolute -bottom-16 -right-10 size-44 rounded-full opacity-25 blur-3xl" />
          <p className="relative text-xs text-secondary/65">Owed to the venue</p>
          <p className="relative mt-1 text-3xl font-bold">{rupees(statement.totals.total)}</p>
          <p className="relative mt-2 text-xs text-secondary/65">
            {rupees(statement.totals.linesAmount)} from bookings and plans
            {statement.totals.adjustmentsAmount !== 0 && `, ${rupees(statement.totals.adjustmentsAmount)} in adjustments`}
          </p>
          {statement.status === "paid" && (
            <p className="relative mt-3 rounded-lg bg-secondary/10 px-3 py-2 text-xs">
              Paid on {formatDay(statement.paidOn!)}, UTR {statement.utr}
              {statement.paymentNote && `. ${statement.paymentNote}`}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-primary/8 px-3 py-2 text-sm text-primary">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {isDraft && (
            <>
              {statement.venueRemoved && (
                <p className="basis-full rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
                  This venue was deleted. Deduct what is being refunded to its members as adjustments, then issue this final statement.
                </p>
              )}
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run("issue", () => issueStatement(statement.id))}
                className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-secondary shadow-sm disabled:opacity-60"
              >
                <Send aria-hidden="true" className="size-4" />
                {busy === "issue" ? "Issuing..." : "Issue to venue"}
              </button>
              {!statement.venueRemoved && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run("regenerate", () => generateStatements(statement.month, statement.venue.slug))}
                className="inline-flex items-center gap-2 rounded-lg border border-tertiary/15 bg-secondary px-4 py-2 text-sm font-medium text-tertiary shadow-sm hover:border-tertiary/30 disabled:opacity-60"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                {busy === "regenerate" ? "Rebuilding..." : "Regenerate"}
              </button>
              )}
            </>
          )}
          {statement.status === "issued" && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void run("unissue", () => unissueStatement(statement.id))}
              className="inline-flex items-center gap-2 rounded-lg border border-tertiary/15 bg-secondary px-4 py-2 text-sm font-medium text-tertiary shadow-sm hover:border-tertiary/30 disabled:opacity-60"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              {busy === "unissue" ? "Undoing..." : "Undo issue"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void downloadStatement(statement, "admin").catch((caught) => setError(readApiError(caught).message))}
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-tertiary/65 hover:text-primary"
          >
            <Download aria-hidden="true" className="size-4" />
            CSV
          </button>
        </div>

        {statement.status === "issued" && (
          <form onSubmit={submitPayment} noValidate className="rounded-2xl border border-tertiary/10 bg-secondary p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-tertiary">Record the transfer</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="paid-utr" className="mb-1 block text-xs font-medium text-tertiary/70">UTR number</label>
                <input
                  id="paid-utr"
                  value={payment.utr}
                  onChange={(event) => setPayment((current) => ({ ...current, utr: event.target.value.toUpperCase() }))}
                  className={cn(INPUT, "font-mono")}
                />
              </div>
              <div>
                <label htmlFor="paid-on" className="mb-1 block text-xs font-medium text-tertiary/70">Paid on</label>
                <input
                  id="paid-on"
                  type="date"
                  max={todayIso()}
                  value={payment.paidOn}
                  onChange={(event) => setPayment((current) => ({ ...current, paidOn: event.target.value }))}
                  className={INPUT}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="paid-note" className="mb-1 block text-xs font-medium text-tertiary/70">Note (optional)</label>
                <input
                  id="paid-note"
                  value={payment.note}
                  onChange={(event) => setPayment((current) => ({ ...current, note: event.target.value }))}
                  className={INPUT}
                />
              </div>
            </div>
            {!statement.payoutAccount && (
              <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
                No bank details were on file when this was issued. Check where the money went before marking it paid.
              </p>
            )}
            <button
              type="submit"
              disabled={busy !== null}
              className="cta-gradient mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-secondary shadow-sm disabled:opacity-60"
            >
              {busy === "paid" ? "Saving..." : "Mark paid"}
            </button>
          </form>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold text-tertiary">Items</h3>
          <StatementLines statement={statement} />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-tertiary">Adjustments</h3>
          {statement.adjustments.length > 0 && (
            <ul className="mb-3 flex flex-col gap-2">
              {statement.adjustments.map((item, index) => (
                <li key={`${item.addedAt}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-2.5 text-sm shadow-sm">
                  <span className="min-w-0 text-tertiary/80">
                    {item.note}
                    <span className="block text-xs text-tertiary/50">{item.addedBy}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className={cn("font-semibold", item.amount < 0 ? "text-primary" : "text-green-700")}>
                      {item.amount < 0 ? "−" : "+"}
                      {rupees(Math.abs(item.amount))}
                    </span>
                    {isDraft && (
                      <button
                        type="button"
                        disabled={busy !== null}
                        aria-label={`Remove adjustment ${item.note}`}
                        onClick={() => void run("remove", () => removeAdjustment(statement.id, index))}
                        className="text-tertiary/45 hover:text-primary"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {isDraft ? (
            <form onSubmit={submitAdjustment} noValidate className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-tertiary/20 p-3">
              <div className="inline-flex rounded-lg border border-tertiary/15 bg-secondary p-0.5 text-xs">
                {[true, false].map((isCredit) => (
                  <button
                    key={String(isCredit)}
                    type="button"
                    aria-pressed={adjustment.isCredit === isCredit}
                    onClick={() => setAdjustment((current) => ({ ...current, isCredit }))}
                    className={cn("rounded-md px-2.5 py-1.5 font-medium", adjustment.isCredit === isCredit ? "bg-tertiary text-secondary" : "text-tertiary/65")}
                  >
                    {isCredit ? "Add" : "Deduct"}
                  </button>
                ))}
              </div>
              <label className="w-28">
                <span className="sr-only">Amount in rupees</span>
                <input
                  inputMode="decimal"
                  placeholder="₹ amount"
                  value={adjustment.amount}
                  onChange={(event) => setAdjustment((current) => ({ ...current, amount: event.target.value.replace(/[^\d.]/g, "") }))}
                  className={INPUT}
                />
              </label>
              <label className="min-w-40 grow">
                <span className="sr-only">What it is for</span>
                <input
                  placeholder="What it is for"
                  value={adjustment.note}
                  onChange={(event) => setAdjustment((current) => ({ ...current, note: event.target.value }))}
                  className={INPUT}
                />
              </label>
              <button
                type="submit"
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-tertiary px-3 py-2 text-sm font-medium text-secondary disabled:opacity-60"
              >
                <Plus aria-hidden="true" className="size-4" />
                Add
              </button>
            </form>
          ) : (
            statement.adjustments.length === 0 && <p className="text-sm text-tertiary/55">None. Corrections go on next month&apos;s draft.</p>
          )}
        </section>

        {statement.venueRemoved ? (
          <section className="rounded-2xl border border-tertiary/10 bg-secondary p-4 text-sm shadow-sm">
            <h3 className="font-semibold text-tertiary">Bank details kept from the venue</h3>
            {statement.payoutAccount ? (
              <p className="mt-2 text-tertiary/75">
                {statement.payoutAccount.accountName}, {statement.payoutAccount.bankName}, XXXX{statement.payoutAccount.accountNumberLast4},{" "}
                {statement.payoutAccount.ifsc}
              </p>
            ) : (
              <p className="mt-2 text-amber-900">None were on file when the venue was deleted.</p>
            )}
          </section>
        ) : (
          <BankDetailsCard venueSlug={statement.venue.slug} />
        )}
      </div>
    </RecordDrawer>
  );
};

export default StatementDrawer;
