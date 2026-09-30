"use client";

import { useState } from "react";
import { ChevronRight, Landmark, Sparkles, TriangleAlert } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { usePayouts } from "@/hooks/usePayouts";
import { generateStatements } from "@/libs/api/payouts";
import { readApiError } from "@/libs/api/errors";
import { STATEMENT_STATUS_LABELS } from "@/types/payout";
import { cn } from "@/utils";
import { todayIso } from "@/utils/date";
import BankDetailsCard from "./components/payouts/BankDetailsCard";
import RefundsPanel from "./components/payouts/RefundsPanel";
import StatementDrawer from "./components/payouts/StatementDrawer";
import ViewSwitch from "./components/records/ViewSwitch";
import useSWR from "swr";
import { fetchRefunds } from "@/libs/api/venueRemoval";
import { STATUS_STYLE, previousMonthOf, recentMonths, rowState, rupees } from "./components/payouts/payoutRules";
import RecordDrawer from "./components/records/RecordDrawer";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
  PartnerStat as Stat,
} from "../Partner/components/PartnerUi";

const AdminPayoutsPage = () => {
  const [today] = useState(todayIso);
  const [month, setMonth] = useState(() => previousMonthOf(today));
  const { rows, error, isLoading, mutate } = usePayouts(month);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bankFor, setBankFor] = useState<{ slug: string; name: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<"statements" | "refunds">("statements");
  const { data: dueRefunds, mutate: refreshRefunds } = useSWR(["admin/refunds", "due"], () => fetchRefunds("due"));

  const generate = async (venueSlug?: string) => {
    setBusy(venueSlug ?? "all");
    setNotice(null);
    try {
      const { statements } = await generateStatements(month, venueSlug);
      await mutate();
      if (!venueSlug) setNotice(statements.length ? `${statements.length} statements are ready to check.` : "Nothing payable for this month.");
    } catch (caught) {
      setNotice(readApiError(caught).message);
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return <Skeleton />;

  const states = rows.map((row) => ({ row, state: rowState(row) }));
  const owed = states.reduce((sum, item) => sum + item.state.total, 0);
  const unpaid = states.filter((item) => item.state.label === "issued").reduce((sum, item) => sum + item.state.total, 0);
  const paid = states.filter((item) => item.state.label === "paid").reduce((sum, item) => sum + item.state.total, 0);
  const missingBank = states.filter((item) => item.state.total > 0 && !item.row.hasBankDetails).length;

  return (
    <>
      <PageHeader
        title="Payouts"
        description="What each venue is owed for the month. Generate, check and issue statements, then record the bank transfer."
      />

      <div className="mt-6">
        <ViewSwitch
          value={view}
          onChange={setView}
          views={[
            { value: "statements", label: "Venue statements" },
            { value: "refunds", label: "Refunds to members", badge: dueRefunds?.length ?? 0 },
          ]}
        />
      </div>

      {view === "refunds" ? (
        <RefundsPanel onChanged={() => refreshRefunds()} />
      ) : (
      <>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <SelectField label="Month" value={month} onChange={setMonth} options={recentMonths(today)} className="w-56" />
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void generate()}
          className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          {busy === "all" ? "Generating..." : "Generate drafts"}
        </button>
      </div>

      {notice && (
        <p role="status" className="mt-3 rounded-lg bg-tertiary/5 px-3 py-2 text-sm text-tertiary/75">
          {notice}
        </p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Owed for the month" value={rupees(owed)} hint="Drafts, statements and items not yet on one" />
        <Stat label="Issued, not paid" value={rupees(unpaid)} />
        <Stat label="Paid" value={rupees(paid)} />
        <Stat label="Missing bank details" value={String(missingBank)} hint={missingBank ? "Venues owed money" : "All set"} />
      </dl>

      <div className={`${CARD} mt-5 overflow-x-auto`}>
        {error ? (
          <p role="alert" className="px-6 py-14 text-center text-sm text-primary">
            We couldn&apos;t load payouts. Refresh to try again.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-tertiary/60">No venues yet.</p>
        ) : (
          <table className="w-full min-w-3xl text-left text-sm">
            <thead className="border-b border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Venue</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold">Items</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Total</th>
                <th scope="col" className="px-5 py-3 font-semibold">Bank</th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/8">
              {states.map(({ row, state }) => (
                <tr
                  key={row.venue.slug}
                  className={cn("transition-colors", row.statement && "cursor-pointer hover:bg-tertiary/3")}
                  onClick={() => row.statement && setOpenId(row.statement.id)}
                >
                  <td className="px-5 py-3.5 font-medium text-tertiary">
                    {row.venue.name}
                    {row.removed && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Venue removed</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {row.statement ? (
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[row.statement.status])}>
                        {STATEMENT_STATUS_LABELS[row.statement.status]}
                      </span>
                    ) : state.label === "not-generated" ? (
                      <span className="rounded-full bg-tertiary/8 px-2.5 py-0.5 text-xs font-medium text-tertiary/70">Not generated</span>
                    ) : (
                      <span className="text-xs text-tertiary/45">Nothing payable</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-tertiary/75">{state.items || ""}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-tertiary">{state.total ? rupees(state.total) : ""}</td>
                  <td className="px-5 py-3.5">
                    {row.removed ? (
                      <span className="text-xs text-tertiary/55">{row.hasBankDetails ? "Kept on statement" : "None on file"}</span>
                    ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setBankFor(row.venue);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                        row.hasBankDetails ? "bg-green-500/10 text-green-800 hover:bg-green-500/20" : "bg-amber-500/15 text-amber-800 hover:bg-amber-500/25",
                      )}
                    >
                      {row.hasBankDetails ? <Landmark aria-hidden="true" className="size-3.5" /> : <TriangleAlert aria-hidden="true" className="size-3.5" />}
                      {row.hasBankDetails ? "On file" : "Missing"}
                    </button>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {row.statement ? (
                      <ChevronRight aria-hidden="true" className="ml-auto size-4 text-tertiary/40" />
                    ) : (
                      state.label === "not-generated" && (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={(event) => {
                            event.stopPropagation();
                            void generate(row.venue.slug);
                          }}
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                        >
                          {busy === row.venue.slug ? "Generating..." : "Generate"}
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-tertiary/55">
        A venue is owed what its customers paid; refunds are paid by the venue and never deducted. Items that become payable
        after a statement is issued go on the next one.
      </p>
      </>
      )}

      {openId && <StatementDrawer statementId={openId} onClose={() => setOpenId(null)} onChanged={() => mutate()} />}

      {bankFor && (
        <RecordDrawer title={bankFor.name} subtitle="Where this venue's payouts go" onClose={() => setBankFor(null)}>
          <BankDetailsCard venueSlug={bankFor.slug} />
        </RecordDrawer>
      )}
    </>
  );
};

export default AdminPayoutsPage;
