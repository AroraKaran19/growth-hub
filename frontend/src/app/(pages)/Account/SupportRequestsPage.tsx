"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, LifeBuoy, MessageSquareText, Plus } from "lucide-react";
import { SupportStatusPill, ageLabel } from "@/app/components/shared/SupportUi";
import { useMySupport } from "@/hooks/useSupport";
import { SUPPORT_CATEGORY_LABELS, type MemberSupportSummary } from "@/types/support";
import { cn } from "@/utils";

const RAISE_HREF = "/support#raise";

const isActive = (request: MemberSupportSummary) => request.status === "open" || request.status === "in-progress";

const hasNewReply = (request: MemberSupportSummary) => request.lastFrom === "growth-hub" && request.status !== "closed";

const RequestCard = ({ request, index }: { request: MemberSupportSummary; index: number }) => (
  <li style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }} className="animate-[fade-up_0.35s_ease-out_both] motion-reduce:animate-none">
    <Link
      href={`/account/support/${request.ref}`}
      className="group flex items-center gap-4 rounded-2xl border border-tertiary/8 bg-secondary p-4 shadow-md shadow-tertiary/5 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5"
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl",
          hasNewReply(request) ? "cta-gradient text-secondary shadow-md shadow-primary/25" : "bg-primary/8 text-primary",
        )}
      >
        <MessageSquareText aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-tertiary">{request.subject}</p>
          {hasNewReply(request) && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">New reply</span>
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tertiary/55">
          <span className="font-mono">{request.ref}</span>
          <span aria-hidden="true">·</span>
          <span>{SUPPORT_CATEGORY_LABELS[request.category]}</span>
          {request.related && (
            <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-tertiary/65 ring-1 ring-tertiary/8">{request.related.ref}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <SupportStatusPill status={request.status} />
        <span className="text-xs text-tertiary/45">{ageLabel(request.lastActivityAt)} ago</span>
      </div>
      <ChevronRight
        aria-hidden="true"
        className="hidden size-4 shrink-0 text-tertiary/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:block motion-reduce:transition-none"
      />
    </Link>
  </li>
);

const SupportRequestsPage = () => {
  const { requests, error, isLoading } = useMySupport();
  const active = requests.filter(isActive).length;
  const replies = requests.filter(hasNewReply).length;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tertiary">Support</h1>
          <p className="mt-1 text-sm text-tertiary/60">Requests you&apos;ve raised with Growth Hub, and every reply.</p>
        </div>
        {requests.length > 0 && (
          <Link
            href={RAISE_HREF}
            className="cta-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/20 transition-opacity hover:opacity-90"
          >
            <Plus aria-hidden="true" className="size-4" />
            Raise a request
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 h-64 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
      ) : error ? (
        <p role="alert" className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-10 text-center text-sm text-tertiary">
          We couldn&apos;t load your requests. Refresh to try again.
        </p>
      ) : requests.length === 0 ? (
        <div className="relative mt-6 overflow-hidden rounded-3xl bg-tertiary px-6 py-12 text-center text-secondary shadow-xl shadow-tertiary/20">
          <div aria-hidden="true" className="cta-banner absolute -right-16 -top-24 size-64 rounded-full opacity-35 blur-3xl" />
          <span className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-secondary/10 ring-1 ring-secondary/15">
            <LifeBuoy aria-hidden="true" className="size-6" />
          </span>
          <p className="relative mt-4 text-lg font-semibold">No requests yet</p>
          <p className="relative mx-auto mt-2 max-w-sm text-sm text-secondary/65">
            If something goes wrong with a booking, payment or check-in, raise it from the Help Center and track it here.
          </p>
          <Link
            href={RAISE_HREF}
            className="cta-gradient relative mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-secondary shadow-lg shadow-primary/30 transition-opacity hover:opacity-90"
          >
            Raise a request
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="relative mt-6 overflow-hidden rounded-2xl bg-tertiary px-6 py-5 text-secondary shadow-xl shadow-tertiary/20">
            <div aria-hidden="true" className="absolute -right-10 -top-14 size-40 rounded-full bg-primary/40 blur-3xl" />
            <dl className="relative flex flex-wrap gap-x-10 gap-y-3">
              <div>
                <dt className="text-sm text-secondary/60">Active</dt>
                <dd className="text-2xl font-bold">{active}</dd>
              </div>
              <div>
                <dt className="text-sm text-secondary/60">New replies</dt>
                <dd className="text-2xl font-bold">{replies}</dd>
              </div>
              <div>
                <dt className="text-sm text-secondary/60">All requests</dt>
                <dd className="text-2xl font-bold">{requests.length}</dd>
              </div>
            </dl>
          </div>
          <ul className="mt-5 flex flex-col gap-3">
            {requests.map((request, index) => (
              <RequestCard key={request.ref} request={request} index={index} />
            ))}
          </ul>
        </>
      )}
    </>
  );
};

export default SupportRequestsPage;
