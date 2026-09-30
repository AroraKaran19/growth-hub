"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { ChevronRight, Download, Landmark, ReceiptText } from "lucide-react";
import { useMyStatements } from "@/hooks/usePayouts";
import { downloadStatement, fetchMyStatement } from "@/libs/api/payouts";
import { readApiError } from "@/libs/api/errors";
import { STATEMENT_STATUS_LABELS, type Statement } from "@/types/payout";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import RecordDrawer from "../Admin/components/records/RecordDrawer";
import StatementLines from "../Admin/components/payouts/StatementLines";
import { STATUS_STYLE, rupees } from "../Admin/components/payouts/payoutRules";
import { PARTNER_CARD, PartnerPageHeader, PartnerSkeleton } from "./components/PartnerUi";

const StatementDetail = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const { data: statement, error } = useSWR(["partner/statement", id], () => fetchMyStatement(id));
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (error) {
    return (
      <RecordDrawer title="Statement" subtitle="Not available" onClose={onClose}>
        <p className="text-sm text-primary">{readApiError(error).message}</p>
      </RecordDrawer>
    );
  }
  if (!statement) {
    return (
      <RecordDrawer title="Statement" subtitle="Loading..." onClose={onClose}>
        <div className="h-64 animate-pulse rounded-2xl bg-tertiary/5" />
      </RecordDrawer>
    );
  }

  return (
    <RecordDrawer
      title={statement.monthLabel}
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
          <p className="relative text-xs text-secondary/65">{statement.status === "paid" ? "Paid to you" : "Due to you"}</p>
          <p className="relative mt-1 text-3xl font-bold">{rupees(statement.totals.total)}</p>
          <p className="relative mt-2 text-xs text-secondary/70">
            {statement.status === "paid"
              ? `Paid on ${formatDay(statement.paidOn!)}, UTR ${statement.utr}`
              : "Growth Hub transfers this to your bank account on file."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void downloadStatement(statement, "partner").catch((caught) => setDownloadError(readApiError(caught).message))}
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-tertiary/70 hover:text-primary"
        >
          <Download aria-hidden="true" className="size-4" />
          Download CSV
        </button>
        {downloadError && <p role="alert" className="text-sm text-primary">{downloadError}</p>}

        <StatementLines statement={statement} />

        {statement.adjustments.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-tertiary">Adjustments</h3>
            <ul className="flex flex-col gap-2">
              {statement.adjustments.map((item, index) => (
                <li key={`${item.addedAt}-${index}`} className="flex justify-between gap-3 rounded-xl bg-secondary px-4 py-2.5 text-sm shadow-sm">
                  <span className="text-tertiary/80">{item.note}</span>
                  <span className={cn("font-semibold", item.amount < 0 ? "text-primary" : "text-green-700")}>
                    {item.amount < 0 ? "−" : "+"}
                    {rupees(Math.abs(item.amount))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </RecordDrawer>
  );
};

const StatementCard = ({ statement, onOpen }: { statement: Statement; onOpen: () => void }) => (
  <li>
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-4 rounded-2xl border border-tertiary/10 bg-secondary p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ReceiptText aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 grow">
        <span className="block text-base font-semibold text-tertiary">{statement.monthLabel}</span>
        <span className="block text-xs text-tertiary/55">
          {statement.totals.lineCount} items
          {statement.status === "paid" && statement.paidOn ? `, paid on ${formatDay(statement.paidOn)}` : ""}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-lg font-bold text-tertiary">{rupees(statement.totals.total)}</span>
        <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[statement.status])}>
          {STATEMENT_STATUS_LABELS[statement.status]}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-tertiary/35 transition-transform group-hover:translate-x-0.5" />
    </button>
  </li>
);

/** Monthly statements of what Growth Hub owes the venue, and the bank account it pays into. */
const PartnerStatementsPage = () => {
  const { statements, payoutAccount, error, isLoading } = useMyStatements();
  const searchParams = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(() => searchParams.get("open"));

  if (isLoading) return <PartnerSkeleton />;

  const unpaid = statements.filter((statement) => statement.status === "issued").reduce((sum, item) => sum + item.totals.total, 0);

  return (
    <>
      <PartnerPageHeader
        title="Statements"
        description="Each month Growth Hub pays you what your customers paid for completed visits and plans. Refunds you give stay with you."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          {error ? (
            <p role="alert" className={`${PARTNER_CARD} px-6 py-14 text-center text-sm text-primary`}>
              We couldn&apos;t load your statements. Refresh to try again.
            </p>
          ) : statements.length === 0 ? (
            <div className={`${PARTNER_CARD} px-6 py-14 text-center`}>
              <p className="text-base font-semibold text-tertiary">No statements yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
                Your first statement appears here after the end of the month in which your first bookings are completed.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {statements.map((statement) => (
                <StatementCard key={statement.id} statement={statement} onOpen={() => setOpenId(statement.id)} />
              ))}
            </ul>
          )}
        </section>

        <aside className="flex h-fit flex-col gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-lg">
            <div aria-hidden="true" className="cta-banner absolute -right-12 -top-16 size-44 rounded-full opacity-30 blur-3xl" />
            <p className="relative text-xs text-secondary/65">Issued, waiting for transfer</p>
            <p className="relative mt-1 text-3xl font-bold">{rupees(unpaid)}</p>
          </div>

          <section className={`${PARTNER_CARD} p-5 shadow-sm`}>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-tertiary">
              <Landmark aria-hidden="true" className="size-4 text-primary" />
              Bank account
            </h2>
            {payoutAccount ? (
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-tertiary/55">Account</dt>
                  <dd className="font-mono text-tertiary">{payoutAccount.accountNumberMasked}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-tertiary/55">IFSC</dt>
                  <dd className="font-mono text-tertiary">{payoutAccount.ifsc}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-tertiary/55">Bank</dt>
                  <dd className="text-tertiary">{payoutAccount.bankName}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900">No bank account on file yet.</p>
            )}
            <p className="mt-3 text-xs text-tertiary/55">To change your bank details, contact Growth Hub.</p>
          </section>
        </aside>
      </div>

      {openId && <StatementDetail id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
};

export default PartnerStatementsPage;
