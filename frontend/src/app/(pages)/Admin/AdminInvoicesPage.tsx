"use client";

import { useState } from "react";
import { CircleAlert, MailCheck, RotateCcw } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { useAdminInvoices } from "@/hooks/useInvoices";
import { retryInvoice } from "@/libs/api/invoices";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import type { AdminInvoice, InvoiceJobStatus, InvoiceKind } from "@/types/invoice";
import { cn } from "@/utils";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";

const STATUS: Record<InvoiceJobStatus, { label: string; style: string }> = {
  pending: { label: "Queued", style: "bg-amber-500/12 text-amber-800" },
  processing: { label: "Generating", style: "bg-amber-500/12 text-amber-800" },
  done: { label: "Ready", style: "bg-green-500/12 text-green-700" },
  failed: { label: "Failed", style: "bg-primary/10 text-primary" },
};

const KIND: Record<InvoiceKind, string> = {
  booking: "Pass",
  "membership-charge": "Membership",
  "addon-order": "Add-ons",
};

const FILTERS = [
  { value: "", label: "All invoices" },
  { value: "pending", label: "Queued" },
  { value: "done", label: "Ready" },
  { value: "failed", label: "Failed" },
];

const RetryButton = ({ invoice, onDone }: { invoice: AdminInvoice; onDone: () => Promise<unknown> }) => {
  const [isBusy, setIsBusy] = useState(false);
  const retry = async () => {
    setIsBusy(true);
    try {
      await retryInvoice(invoice.id);
      await onDone();
      toastDone(`${invoice.number} is queued again.`);
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      setIsBusy(false);
    }
  };
  return (
    <button
      type="button"
      disabled={isBusy}
      onClick={() => void retry()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-tertiary/20 px-3 py-1.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5 disabled:opacity-50"
    >
      <RotateCcw aria-hidden="true" className="size-3.5" />
      {isBusy ? "Retrying..." : "Retry"}
    </button>
  );
};

/** Invoice PDFs made by the background worker; failed ones can be queued again. */
const AdminInvoicesPage = () => {
  const [status, setStatus] = useState("");
  const { invoices, error, isLoading, mutate } = useAdminInvoices(status);
  const failedCount = invoices.filter((invoice) => invoice.status === "failed").length;

  if (isLoading) return <Skeleton />;

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Every paid pass, membership payment and add-on order gets a PDF invoice, made in the background and emailed to the member."
        actions={<SelectField label="Show" hideLabel value={status} onChange={setStatus} options={FILTERS} className="w-48" />}
      />

      {failedCount > 0 && status !== "failed" && (
        <p role="alert" className="mt-5 flex items-center gap-2 rounded-xl bg-primary/8 px-4 py-3 text-sm text-tertiary">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-primary" />
          {failedCount} invoice{failedCount === 1 ? "" : "s"} could not be made. Check the error and retry once fixed.
        </p>
      )}

      <div className={cn(CARD, "mt-6 overflow-x-auto shadow-sm")}>
        {error ? (
          <p role="alert" className="px-6 py-14 text-center text-sm text-primary">
            We couldn&apos;t load invoices. Refresh to try again.
          </p>
        ) : invoices.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-tertiary/55">No invoices here yet.</p>
        ) : (
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className="border-b border-tertiary/8 text-xs text-tertiary/55">
                <th scope="col" className="px-5 py-3 font-semibold">Invoice</th>
                <th scope="col" className="px-5 py-3 font-semibold">Member</th>
                <th scope="col" className="px-5 py-3 font-semibold">For</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-tertiary/6 align-top last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="font-mono text-tertiary">{invoice.number}</p>
                    <p className="text-xs text-tertiary/50">{KIND[invoice.kind]}</p>
                  </td>
                  <td className="px-5 py-3.5 text-tertiary">{invoice.member}</td>
                  <td className="px-5 py-3.5 text-tertiary/75">{invoice.reference}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS[invoice.status].style)}>
                      {STATUS[invoice.status].label}
                    </span>
                    {invoice.emailed && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-tertiary/55">
                        <MailCheck aria-hidden="true" className="size-3.5" />
                        Emailed
                      </span>
                    )}
                    {invoice.lastError && invoice.status !== "done" && (
                      <p className="mt-1.5 max-w-xs text-xs text-primary">
                        Attempt {invoice.attempts}: {invoice.lastError}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {invoice.status === "failed" && <RetryButton invoice={invoice} onDone={mutate} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default AdminInvoicesPage;
