"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Hourglass, Paperclip, Search } from "lucide-react";
import { SupportStatusPill, ageLabel } from "@/app/components/shared/SupportUi";
import SelectField from "@/app/components/ui/form/SelectField";
import { useAdminSupport } from "@/hooks/useSupport";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  type AdminSupportSummary,
  type SupportStatus,
} from "@/types/support";
import { cn } from "@/utils";
import { PartnerPageHeader as PageHeader } from "../Partner/components/PartnerUi";
import SupportDrawer from "./components/support/SupportDrawer";

const STALE_MS = 24 * 60 * 60 * 1000;
const SEARCH_DELAY_MS = 300;
const LIST_LIMIT = 200;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...SUPPORT_STATUSES.map((value) => ({ value, label: SUPPORT_STATUS_LABELS[value] })),
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All topics" },
  ...SUPPORT_CATEGORIES.map((value) => ({ value, label: SUPPORT_CATEGORY_LABELS[value] })),
];

const TILE_ACCENT: Record<SupportStatus, string> = {
  open: "bg-amber-400",
  "in-progress": "bg-blue-400",
  resolved: "bg-emerald-400",
  closed: "bg-secondary/40",
};

const isWaiting = (request: AdminSupportSummary) =>
  (request.status === "open" || request.status === "in-progress") && request.awaitingReplySince !== null && Date.now() - new Date(request.awaitingReplySince).getTime() > STALE_MS;

const statusFromUrl = (value: string | null) => (SUPPORT_STATUSES as readonly string[]).includes(value ?? "") ? (value as string) : "";

const Row = ({ request, index, onOpen }: { request: AdminSupportSummary; index: number; onOpen: () => void }) => {
  const waiting = isWaiting(request);
  return (
    <li style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }} className="animate-[fade-up_0.3s_ease-out_both] motion-reduce:animate-none">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-2xl border bg-secondary p-4 text-left shadow-sm shadow-tertiary/5 transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_7rem_7.5rem_1rem]",
          waiting ? "border-amber-500/40" : "border-tertiary/8 hover:border-primary/25",
        )}
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold text-tertiary">{request.subject}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tertiary/55">
            <span className="font-mono">{request.ref}</span>
            <span aria-hidden="true">·</span>
            <span>{SUPPORT_CATEGORY_LABELS[request.category]}</span>
            {request.source === "contact-form" && (
              <span className="rounded-full bg-tertiary/6 px-2 py-0.5 text-tertiary/65">Contact form</span>
            )}
            {request.attachmentCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Paperclip aria-hidden="true" className="size-3" />
                {request.attachmentCount}
                <span className="sr-only"> screenshots</span>
              </span>
            )}
          </span>
        </span>
        <span className="col-start-1 min-w-0 md:col-start-auto">
          <span className="block truncate text-sm font-medium text-tertiary">{request.contact.name}</span>
          <span className="block truncate text-xs text-tertiary/55">{request.contact.email ?? request.contact.phone ?? "No contact given"}</span>
        </span>
        <span className="col-start-2 row-start-1 flex flex-col items-end gap-1 md:col-start-auto md:row-start-auto md:items-start">
          <span className={cn("inline-flex items-center gap-1 text-xs", waiting ? "font-semibold text-amber-700" : "text-tertiary/55")}>
            {waiting && <Hourglass aria-hidden="true" className="size-3.5" />}
            {ageLabel(request.createdAt)} old
          </span>
          <SupportStatusPill status={request.status} className="md:hidden" />
        </span>
        <span className="hidden md:block">
          <SupportStatusPill status={request.status} />
        </span>
        <ChevronRight
          aria-hidden="true"
          className="hidden size-4 text-tertiary/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary md:block motion-reduce:transition-none"
        />
      </button>
    </li>
  );
};

/** Customers' help requests: status counts, filters, and a drawer to reply and move them along. */
const AdminSupportPage = () => {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(() => statusFromUrl(searchParams.get("status")));
  const [waiting, setWaiting] = useState(() => searchParams.get("waiting") === "1");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [openRef, setOpenRef] = useState<string | null>(null);
  const { requests, counts, error, isLoading, mutate } = useAdminSupport({ status, category, q: search, waiting });

  const pickStatus = (next: string) => {
    setStatus(next);
    setWaiting(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = Boolean(status || category || search.trim() || waiting);

  return (
    <>
      <PageHeader
        title="Support requests"
        description="Help requests from customers' accounts and the Contact form. Replies and status changes are emailed to the customer."
      />

      <section
        aria-label="Requests by status"
        className="relative mt-6 overflow-hidden rounded-2xl bg-tertiary p-4 text-secondary shadow-xl shadow-tertiary/20 sm:p-5"
      >
        <div aria-hidden="true" className="cta-banner absolute -right-20 -top-28 size-72 rounded-full opacity-30 blur-3xl" />
        <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SUPPORT_STATUSES.map((value, index) => {
            const active = status === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => pickStatus(active ? "" : value)}
                style={{ animationDelay: `${index * 60}ms` }}
                className={cn(
                  "animate-[fade-up_0.4s_ease-out_both] rounded-xl px-4 py-3 text-left ring-1 backdrop-blur-sm transition-all motion-reduce:animate-none motion-reduce:transition-none",
                  active ? "bg-secondary text-tertiary ring-secondary shadow-lg" : "bg-secondary/8 ring-secondary/10 hover:bg-secondary/14",
                )}
              >
                <span className="flex items-center gap-2 text-xs">
                  <span aria-hidden="true" className={cn("size-2 rounded-full", TILE_ACCENT[value])} />
                  <span className={active ? "text-tertiary/65" : "text-secondary/65"}>{SUPPORT_STATUS_LABELS[value]}</span>
                </span>
                <span className="mt-1 block text-2xl font-bold">{counts ? counts[value] : "-"}</span>
              </button>
            );
          })}
        </div>
        {counts && (counts.waiting > 0 || waiting) && (
          <button
            type="button"
            aria-pressed={waiting}
            onClick={() => {
              setWaiting(!waiting);
              setStatus("");
            }}
            className={cn(
              "relative mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors",
              waiting
                ? "bg-amber-300 text-tertiary ring-amber-300 shadow-lg"
                : "bg-amber-400/15 text-amber-200 ring-amber-300/25 hover:bg-amber-400/25",
            )}
          >
            <Hourglass aria-hidden="true" className="size-3.5" />
            {counts.waiting} {counts.waiting === 1 ? "request has" : "requests have"} waited over 24 hours for a reply
          </button>
        )}
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-0 grow sm:grow-0">
          <span className="sr-only">Search requests</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary/45" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Reference, name, email or phone"
            className="w-full rounded-xl border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary sm:w-72"
          />
        </label>
        <div className="flex grow flex-wrap justify-end gap-2.5">
          <SelectField label="Filter by topic" hideLabel value={category} onChange={setCategory} options={CATEGORY_OPTIONS} className="w-full sm:w-52" />
          <SelectField label="Filter by status" hideLabel value={status} onChange={pickStatus} options={STATUS_OPTIONS} className="w-full sm:w-44" />
        </div>
      </div>

      <div className="mt-4">
        {isLoading && !requests.length ? (
          <div aria-busy="true" aria-label="Loading" className="h-80 animate-pulse rounded-2xl bg-secondary" />
        ) : error ? (
          <p role="alert" className="rounded-2xl bg-primary/6 px-6 py-14 text-center text-sm text-primary">
            We couldn&apos;t load support requests. Refresh to try again.
          </p>
        ) : requests.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-tertiary/15 px-6 py-14 text-center text-sm text-tertiary/60">
            {filtered ? "No requests match these filters." : "No support requests yet."}
          </p>
        ) : (
          <>
            <div aria-hidden="true" className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_7rem_7.5rem_1rem] gap-x-4 px-4 pb-2 text-xs text-tertiary/50 md:grid">
              <span>Request</span>
              <span>Customer</span>
              <span>Age</span>
              <span>Status</span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {requests.map((request, index) => (
                <Row key={request.ref} request={request} index={index} onOpen={() => setOpenRef(request.ref)} />
              ))}
            </ul>
            {requests.length >= LIST_LIMIT && (
              <p className="mt-3 text-xs text-tertiary/55">Showing the newest {LIST_LIMIT}. Search or filter to find older ones.</p>
            )}
          </>
        )}
      </div>

      {openRef && <SupportDrawer requestRef={openRef} onClose={() => setOpenRef(null)} onChanged={() => void mutate()} />}
    </>
  );
};

export default AdminSupportPage;
