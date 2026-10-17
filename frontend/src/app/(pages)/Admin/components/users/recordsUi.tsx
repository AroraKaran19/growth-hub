"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, FileText, type LucideIcon } from "lucide-react";
import type { RecordsPage } from "@/hooks/useCustomerRecords";
import { cn } from "@/utils";

export type Column<T> = { header: string; cell: (item: T) => ReactNode; className?: string; srOnly?: boolean };

type RecordsTableProps<T> = {
  label: string;
  data: RecordsPage<T> | undefined;
  error: unknown;
  isLoading: boolean;
  isValidating: boolean;
  columns: Column<T>[];
  card: (item: T) => ReactNode;
  keyOf: (item: T) => string;
  empty: { icon: LucideIcon; text: string };
  onPage: (page: number) => void;
};

const CARD = "overflow-hidden rounded-2xl border border-tertiary/10 bg-secondary shadow-lg shadow-tertiary/5";

const PAGE_BUTTON =
  "flex size-9 items-center justify-center rounded-full bg-secondary text-tertiary shadow-md shadow-tertiary/10 ring-1 ring-tertiary/8 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40 motion-reduce:transition-none";

const RecordsSkeleton = () => (
  <div aria-busy="true" aria-label="Loading" className="divide-y divide-tertiary/6">
    {[0, 1, 2, 3].map((row) => (
      <div key={row} className="flex items-center gap-4 px-5 py-4">
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-tertiary/8" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/5 animate-pulse rounded-full bg-tertiary/10" />
          <div className="h-2.5 w-1/4 animate-pulse rounded-full bg-tertiary/6" />
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-tertiary/8" />
      </div>
    ))}
  </div>
);

export const RecordsTable = <T,>({
  label,
  data,
  error,
  isLoading,
  isValidating,
  columns,
  card,
  keyOf,
  empty,
  onPage,
}: RecordsTableProps<T>) => {
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 10;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const EmptyIcon = empty.icon;

  return (
    <div>
      <div className={cn(CARD, "transition-opacity", isValidating && !isLoading && "opacity-70")}>
        {isLoading && !data ? (
          <RecordsSkeleton />
        ) : error && !data ? (
          <p role="alert" className="px-6 py-12 text-center text-sm text-primary">
            We couldn&apos;t load these. Close and open the popup to try again.
          </p>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-tertiary/5 text-tertiary/35">
              <EmptyIcon aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-3 text-sm text-tertiary/60">{empty.text}</p>
          </div>
        ) : (
          <>
            <ul aria-label={label} className="divide-y divide-tertiary/6 sm:hidden">
              {items.map((item) => (
                <li key={keyOf(item)} className="px-4 py-3.5">
                  {card(item)}
                </li>
              ))}
            </ul>
            <table aria-label={label} className="hidden w-full text-left text-sm sm:table">
              <thead>
                <tr className="border-b border-tertiary/8 bg-tertiary/2 text-xs text-tertiary/55">
                  {columns.map((column) => (
                    <th key={column.header} scope="col" className={cn("px-4 py-2.5 font-semibold", column.className)}>
                      {column.srOnly ? <span className="sr-only">{column.header}</span> : column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-tertiary/6">
                {items.map((item) => (
                  <tr key={keyOf(item)} className="align-top transition-colors hover:bg-tertiary/2">
                    {columns.map((column) => (
                      <td key={column.header} className={cn("px-4 py-3", column.className)}>
                        {column.cell(item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {total > pageSize && (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-tertiary/55">
            Showing {first} to {first + items.length - 1} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className={PAGE_BUTTON}>
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <span className="min-w-16 text-center text-sm font-medium text-tertiary">
              {page} of {pages}
            </span>
            <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} className={PAGE_BUTTON}>
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const StatusPill = ({ label, style }: { label: string; style: string }) => (
  <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", style)}>{label}</span>
);

type InvoiceButtonProps = {
  id: string;
  /** Why it can't open yet; absent when ready. */
  blockedReason?: string;
  onOpen: () => void;
};

export const InvoiceButton = ({ id, blockedReason, onOpen }: InvoiceButtonProps) => {
  const tipId = `invoice-tip-${id}`;
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-disabled={blockedReason ? "true" : undefined}
        aria-describedby={blockedReason ? tipId : undefined}
        onClick={() => {
          if (!blockedReason) onOpen();
        }}
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all motion-reduce:transition-none",
          blockedReason
            ? "cursor-not-allowed border-tertiary/10 text-tertiary/40"
            : "border-tertiary/15 bg-secondary text-tertiary shadow-sm hover:-translate-y-0.5 hover:border-tertiary/30 hover:shadow-md motion-reduce:hover:translate-y-0",
        )}
      >
        <FileText aria-hidden="true" className={cn("size-3.5", blockedReason ? "text-tertiary/35" : "text-primary")} />
        Invoice
      </button>
      {blockedReason && (
        <span
          id={tipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full right-0 z-10 mb-1.5 whitespace-nowrap rounded-md bg-tertiary px-2 py-1 text-xs text-secondary opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        >
          {blockedReason}
        </span>
      )}
    </span>
  );
};

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
