"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Crown, Download, Puzzle, ReceiptText } from "lucide-react";
import { useMyInvoices } from "@/hooks/useInvoices";
import { downloadInvoice } from "@/libs/api/invoices";
import type { InvoiceKind, MemberInvoice } from "@/types/invoice";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";

const KIND = {
  booking: { label: "Pass", icon: CalendarCheck },
  "membership-charge": { label: "Membership", icon: Crown },
  "addon-order": { label: "Add-ons", icon: Puzzle },
} satisfies Record<InvoiceKind, { label: string; icon: typeof CalendarCheck }>;

const indiaDay = (instant: string) =>
  formatDay(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(instant)));

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

const InvoiceCard = ({ invoice, index }: { invoice: MemberInvoice; index: number }) => {
  const [isOpening, setIsOpening] = useState(false);
  const { label, icon: Icon } = KIND[invoice.kind];
  const isReady = invoice.status === "ready";

  const open = async () => {
    setIsOpening(true);
    await downloadInvoice(invoice.id);
    setIsOpening(false);
  };

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="animate-[fade-up_0.35s_ease-out_both] motion-reduce:animate-none rounded-2xl border border-tertiary/8 bg-secondary p-4 shadow-md shadow-tertiary/5 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 grow basis-48">
          <p className="truncate font-semibold text-tertiary">{invoice.description}</p>
          <p className="mt-0.5 text-sm text-tertiary/55">
            {label} · {invoice.reference.split(" ").pop()} · {indiaDay(invoice.date)}
          </p>
          <p className="mt-1 font-mono text-xs text-tertiary/45">{invoice.number}</p>
        </div>
        <p className="text-lg font-bold text-tertiary">{rupees(invoice.total)}</p>
        {isReady ? (
          <button
            type="button"
            onClick={() => void open()}
            disabled={isOpening}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Download aria-hidden="true" className="size-4" />
            {isOpening ? "Opening..." : "Download PDF"}
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/12 px-3 py-1.5 text-xs font-medium text-amber-800">
            <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-amber-500" />
            Preparing
          </span>
        )}
      </div>
    </li>
  );
};

const InvoicesPage = () => {
  const { invoices, error, isLoading } = useMyInvoices();
  const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.total, 0);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-tertiary">Invoices</h1>
        <p className="mt-1 text-sm text-tertiary/60">
          One for every pass, membership payment and add-on order. We also email each one to you.
        </p>
      </div>

      {isLoading ? (
        <div className="mt-6 h-64 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
      ) : error ? (
        <p role="alert" className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-10 text-center text-sm text-tertiary">
          We couldn&apos;t load your invoices. Refresh to try again.
        </p>
      ) : invoices.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-tertiary/10 px-6 py-16 text-center">
          <ReceiptText aria-hidden="true" className="mx-auto size-8 text-tertiary/30" />
          <p className="mt-3 text-base font-semibold text-tertiary">No invoices yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">Your invoices appear here after your first booking.</p>
          <Link
            href="/workspaces"
            className="cta-gradient mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary"
          >
            Find a workspace
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="relative mt-6 overflow-hidden rounded-2xl bg-tertiary px-6 py-5 text-secondary shadow-xl shadow-tertiary/20">
            <div aria-hidden="true" className="absolute -right-10 -top-14 size-40 rounded-full bg-primary/40 blur-3xl" />
            <dl className="relative flex flex-wrap gap-x-10 gap-y-3">
              <div>
                <dt className="text-sm text-secondary/60">Invoices</dt>
                <dd className="text-2xl font-bold">{invoices.length}</dd>
              </div>
              <div>
                <dt className="text-sm text-secondary/60">Total paid</dt>
                <dd className="text-2xl font-bold">{rupees(totalPaid)}</dd>
              </div>
            </dl>
          </div>
          <ul className={cn("mt-5 flex flex-col gap-3")}>
            {invoices.map((invoice, index) => (
              <InvoiceCard key={invoice.id} invoice={invoice} index={index} />
            ))}
          </ul>
        </>
      )}
    </>
  );
};

export default InvoicesPage;
