"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { ArrowLeft, Lock, RotateCcw, SendHorizontal } from "lucide-react";
import { SupportStatusPill, SupportStepper, SupportTimeline, supportDateTime, type TimelineItem } from "@/app/components/shared/SupportUi";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { useMySupportRequest } from "@/hooks/useSupport";
import { readApiError } from "@/libs/api/errors";
import { followUpSupport } from "@/libs/api/support";
import { toastDone } from "@/libs/toast";
import { SUPPORT_CATEGORY_LABELS, SUPPORT_LIMITS, type MemberSupportRequest } from "@/types/support";
import { cn } from "@/utils";

const itemsOf = (request: MemberSupportRequest): TimelineItem[] => [
  {
    key: "original",
    kind: "message",
    side: "customer",
    author: "You",
    at: request.createdAt,
    message: request.message,
    attachments: request.attachments,
  },
  ...request.events
    .filter((item) => item.type !== "created")
    .map((item, index) => ({
      key: `${index}-${item.at}`,
      kind: item.type === "status" ? ("status" as const) : ("message" as const),
      side: item.by,
      author: item.by === "growth-hub" ? "Growth Hub" : "You",
      at: item.at,
      message: item.message,
      from: item.from,
      to: item.to,
    })),
];

const FollowUp = ({ request, onSent }: { request: MemberSupportRequest; onSent: (next: MemberSupportRequest) => Promise<void> }) => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!request.canFollowUp) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface px-5 py-4 ring-1 ring-tertiary/8">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-tertiary/60 shadow-sm">
          <Lock aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-tertiary">This request is closed</p>
          <p className="text-sm text-tertiary/60">Still need help? Raise a new request and mention {request.ref}.</p>
        </div>
        <Link href="/support#raise" className="text-sm font-medium text-primary transition-opacity hover:opacity-75">
          Raise a new request
        </Link>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      setError("Write a message.");
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      const next = await followUpSupport(request.ref, message);
      setMessage("");
      await onSent(next);
      toastDone(request.status === "resolved" ? "Sent. We've reopened your request." : "Sent. We'll reply here and by email.");
    } catch (caught) {
      const problem = readApiError(caught);
      setError(problem.fields.message ?? problem.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl bg-secondary p-4 shadow-lg shadow-tertiary/8 ring-1 ring-tertiary/8 sm:p-5">
      <label htmlFor="follow-up" className="flex items-center text-sm font-semibold text-tertiary">
        Add a message
        <RequiredMark />
      </label>
      {request.status === "resolved" && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-tertiary/60">
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Sending a message reopens this request.
        </p>
      )}
      <textarea
        id="follow-up"
        rows={3}
        value={message}
        onChange={(event) => {
          setMessage(event.target.value);
          if (error) setError(null);
        }}
        placeholder="Add details or answer our question"
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "follow-up-error" : undefined}
        maxLength={SUPPORT_LIMITS.messageMax}
        className={cn(
          "mt-3 w-full resize-y rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-primary/20",
          error ? "border-primary" : "border-transparent",
        )}
      />
      {error && (
        <p id="follow-up-error" className="mt-1.5 text-sm text-primary">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={isSending}
          className="cta-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSending ? "Sending..." : "Send"}
          {!isSending && <SendHorizontal aria-hidden="true" className="size-4" />}
        </button>
      </div>
    </form>
  );
};

const SupportRequestDetailPage = ({ requestRef }: { requestRef: string }) => {
  const { request, error, isLoading, mutate } = useMySupportRequest(requestRef);
  const { mutate: mutateAll } = useSWRConfig();

  if (!request) {
    if (isLoading) return <div className="h-96 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />;
    const isMissing = readApiError(error).code === "SUPPORT_REQUEST_NOT_FOUND";
    return (
      <div className="rounded-2xl border border-tertiary/10 bg-secondary px-6 py-16 text-center">
        <p className="text-base font-semibold text-tertiary">
          {isMissing ? "We couldn't find that request" : "We couldn't load this request"}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
          {isMissing ? "It may belong to another account, or the link is incomplete." : "Check your connection and refresh the page."}
        </p>
        <Link
          href="/account/support"
          className="cta-gradient mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-secondary"
        >
          Back to Support
        </Link>
      </div>
    );
  }

  const onSent = async (next: MemberSupportRequest) => {
    await mutate(next, { revalidate: false });
    await mutateAll((key) => Array.isArray(key) && key[0] === "support" && key.length === 2);
  };

  return (
    <>
      <Link href="/account/support" className="inline-flex items-center gap-2 text-sm text-tertiary/60 transition-colors hover:text-tertiary">
        <ArrowLeft aria-hidden="true" className="size-4" />
        All requests
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 text-2xl font-bold text-tertiary wrap-break-word">{request.subject}</h1>
        <SupportStatusPill status={request.status} />
      </div>
      <p className="mt-1 font-mono text-sm text-tertiary/55">{request.ref}</p>

      <section
        aria-label="Request details"
        className="relative mt-6 overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-xl shadow-tertiary/20 sm:p-6"
      >
        <div aria-hidden="true" className="cta-banner absolute -right-16 -top-24 size-60 rounded-full opacity-30 blur-3xl" />
        <div className="relative">
          <SupportStepper status={request.status} tone="dark" />
          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-secondary/55">Topic</dt>
              <dd className="mt-0.5 text-sm font-medium">{SUPPORT_CATEGORY_LABELS[request.category]}</dd>
            </div>
            <div>
              <dt className="text-xs text-secondary/55">Related to</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {request.related ? (
                  <Link
                    href={request.related.kind === "booking" ? `/account/bookings/${request.related.ref}` : "/account/memberships"}
                    className="underline-offset-4 hover:underline"
                  >
                    {request.related.venueName} <span className="font-mono text-secondary/60">{request.related.ref}</span>
                  </Link>
                ) : (
                  "Nothing specific"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-secondary/55">Raised</dt>
              <dd className="mt-0.5 text-sm font-medium">{supportDateTime(request.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mt-6 rounded-2xl border border-tertiary/8 bg-surface p-4 sm:p-6">
        <SupportTimeline items={itemsOf(request)} viewer="customer" />
      </div>

      <div className="mt-5">
        <FollowUp request={request} onSent={onSent} />
      </div>
    </>
  );
};

export default SupportRequestDetailPage;
