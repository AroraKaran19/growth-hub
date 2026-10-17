"use client";

import { useState } from "react";
import useSWR from "swr";
import { Download, FileArchive } from "lucide-react";
import StaffModal from "@/app/components/shared/StaffModal";
import DateField from "@/app/components/ui/form/DateField";
import { readApiError } from "@/libs/api/errors";
import { downloadInvoiceBundle, fetchInvoiceBundleSummary } from "@/libs/api/invoices";
import { toastDone, toastFailed } from "@/libs/toast";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";

type Mode = "day" | "range";

const todayInIndia = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const InvoiceBundleModal = ({ onClose }: { onClose: () => void }) => {
  const today = todayInIndia();
  const [mode, setMode] = useState<Mode>("day");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [isDownloading, setIsDownloading] = useState(false);

  const end = mode === "day" ? from : to;
  const isOrdered = Boolean(from && end) && end >= from;
  const { data: summary, error, isLoading } = useSWR(isOrdered ? ["invoice-bundle", from, end] : null, () =>
    fetchInvoiceBundleSummary(from, end),
  );
  const problem = error ? readApiError(error).message : null;
  const tooMany = Boolean(summary && summary.ready > summary.limit);
  const canDownload = isOrdered && Boolean(summary?.ready) && !tooMany && !isDownloading;
  const period = mode === "day" || from === end ? formatDay(from) : `${formatDay(from)} to ${formatDay(end)}`;

  const download = async () => {
    setIsDownloading(true);
    try {
      await downloadInvoiceBundle(from, end);
      toastDone(`Downloading ${summary?.ready ?? ""} invoices for ${period}.`);
      onClose();
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <StaffModal
      eyebrow="Invoices"
      title="Download in bulk"
      description="Every ready invoice issued in the period, as PDFs in one zip file."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="text-sm font-medium text-tertiary/60 transition-colors hover:text-tertiary">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canDownload}
            onClick={() => void download()}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary shadow-lg shadow-primary/15 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download aria-hidden="true" className="size-4" />
            {isDownloading ? "Preparing zip..." : "Download zip"}
          </button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Period" className="inline-flex rounded-full bg-tertiary/6 p-1">
        {(
          [
            ["day", "Single day"],
            ["range", "Date range"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
              mode === value ? "bg-secondary text-tertiary shadow-sm" : "text-tertiary/60 hover:text-tertiary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={cn("mt-5 grid gap-4", mode === "range" && "sm:grid-cols-2")}>
        <DateField label={mode === "day" ? "Date" : "From"} value={from} onChange={setFrom} max={today} required />
        {mode === "range" && <DateField label="To" value={to} onChange={setTo} min={from} max={today} required />}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl bg-tertiary p-4 text-secondary shadow-lg shadow-tertiary/15">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
          <FileArchive aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 text-sm" aria-live="polite">
          {!isOrdered ? (
            <p className="text-secondary/75">The end date can&apos;t be before the start date.</p>
          ) : isLoading ? (
            <p className="text-secondary/75">Counting invoices for {period}...</p>
          ) : problem ? (
            <p className="text-secondary/75">{problem}</p>
          ) : summary ? (
            <>
              <p className="font-semibold">
                {summary.ready === 0 ? "No invoices are ready" : `${summary.ready} invoice${summary.ready === 1 ? "" : "s"} ready`} for {period}
              </p>
              {summary.notReady > 0 && (
                <p className="mt-0.5 text-secondary/65">
                  {summary.notReady} still being prepared will be left out. Try again in a minute to include them.
                </p>
              )}
              {tooMany && <p className="mt-0.5 text-secondary/65">That&apos;s more than {summary.limit}. Pick a shorter range.</p>}
            </>
          ) : null}
        </div>
      </div>
    </StaffModal>
  );
};

export default InvoiceBundleModal;
