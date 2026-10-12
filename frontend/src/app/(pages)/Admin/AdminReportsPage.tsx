"use client";

import { useState } from "react";
import useSWR from "swr";
import { Download } from "lucide-react";
import BarChart, { formatValue } from "@/app/components/shared/BarChart";
import { downloadReport, fetchReport } from "@/libs/api/reports";
import { readApiError } from "@/libs/api/errors";
import { REPORT_TABS, type ColumnKind, type ReportName } from "@/types/report";
import { cn } from "@/utils";
import { todayIso } from "@/utils/date";
import { PARTNER_CARD as CARD, PartnerPageHeader as PageHeader } from "../Partner/components/PartnerUi";
import { PRESETS, presetRange, type Preset } from "./components/reports/reportRules";
import VenuePicker from "./components/VenuePicker";

const DATE_INPUT =
  "rounded-lg border border-tertiary/15 bg-secondary px-3 py-2 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary";

const CHART_TITLES: Partial<Record<ReportName, string>> = {
  sales: "Collected",
  occupancy: "Desk occupancy",
};

const AdminReportsPage = () => {
  const [today] = useState(todayIso);
  const [tab, setTab] = useState<ReportName>("sales");
  const [range, setRange] = useState(() => presetRange("this-month", today));
  const [preset, setPreset] = useState<Preset | null>("this-month");
  const [venue, setVenue] = useState("");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const query = { ...range, ...(venue && { venue }) };
  const { data: report, error, isLoading } = useSWR(["admin/report", tab, range.from, range.to, venue], () =>
    fetchReport(tab, query),
  );

  const choosePreset = (value: Preset) => {
    setPreset(value);
    setRange(presetRange(value, today));
  };
  const cell = (value: string | number | undefined, kind: ColumnKind) =>
    typeof value === "number" ? formatValue(value, kind) : value;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales, bookings, cancellations, memberships, occupancy, coupons and payouts, for up to 12 months at a time."
      />

      <div
        role="tablist"
        aria-label="Report"
        className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-tertiary/10 bg-secondary p-1 shadow-sm"
      >
        {REPORT_TABS.map((item) => (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={cn(
              "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === item.value ? "bg-tertiary text-secondary" : "text-tertiary/65 hover:text-tertiary",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={preset === item.value}
              onClick={() => choosePreset(item.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                preset === item.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-tertiary/15 text-tertiary/70 hover:border-tertiary/35",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-xs text-tertiary/60">
          From
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(event) => {
              setPreset(null);
              setRange((current) => ({ ...current, from: event.target.value }));
            }}
            className={DATE_INPUT}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tertiary/60">
          To
          <input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(event) => {
              setPreset(null);
              setRange((current) => ({ ...current, to: event.target.value }));
            }}
            className={DATE_INPUT}
          />
        </label>
        <VenuePicker label="Venue" hideLabel allLabel="All venues" value={venue} onChange={(slug) => setVenue(slug)} className="w-56" />
        <button
          type="button"
          disabled={!report}
          onClick={() => {
            setDownloadError(null);
            void downloadReport(tab, query).catch((caught) => setDownloadError(readApiError(caught).message));
          }}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-tertiary/15 bg-secondary px-4 py-2 text-sm font-medium text-tertiary shadow-sm hover:border-tertiary/30 disabled:opacity-50"
        >
          <Download aria-hidden="true" className="size-4" />
          CSV
        </button>
      </div>
      {downloadError && (
        <p role="alert" className="mt-2 text-sm text-primary">
          {downloadError}
        </p>
      )}

      {isLoading ? (
        <div className="mt-5 h-72 animate-pulse rounded-2xl border border-tertiary/10 bg-tertiary/3" />
      ) : error ? (
        <p role="alert" className={`${CARD} mt-5 px-6 py-14 text-center text-sm text-primary`}>
          {Object.values(readApiError(error).fields)[0] ?? readApiError(error).message}
        </p>
      ) : report ? (
        <div className="mt-5 flex flex-col gap-5">
          {report.series && report.series.length > 1 && CHART_TITLES[tab] && (
            <BarChart series={report.series} title={CHART_TITLES[tab]!} />
          )}

          <div className={`${CARD} overflow-x-auto`}>
            {report.rows.length === 0 ? (
              <p className="px-6 py-14 text-center text-sm text-tertiary/60">Nothing to show for these dates.</p>
            ) : (
              <table className="w-full min-w-2xl text-left text-sm">
                <thead className="border-b border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
                  <tr>
                    {report.columns.map((column) => (
                      <th key={column.key} scope="col" className={cn("px-5 py-3 font-semibold", column.kind !== "text" && "text-right")}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/8">
                  {report.rows.map((row, index) => (
                    <tr key={index}>
                      {report.columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn("px-5 py-3", column.kind === "text" ? "text-tertiary/80" : "text-right text-tertiary")}
                        >
                          {cell(row[column.key], column.kind)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {report.totals && (
                  <tfoot className="border-t-2 border-tertiary/15 bg-surface font-semibold">
                    <tr>
                      {report.columns.map((column) => (
                        <td key={column.key} className={cn("px-5 py-3 text-tertiary", column.kind !== "text" && "text-right")}>
                          {cell(report.totals![column.key], column.kind)}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
          {report.note && <p className="text-xs text-tertiary/55">{report.note}</p>}
        </div>
      ) : null}
    </>
  );
};

export default AdminReportsPage;
