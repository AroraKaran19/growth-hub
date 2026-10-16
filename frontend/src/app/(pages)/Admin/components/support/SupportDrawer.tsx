"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, Mail, Phone, UserRoundX } from "lucide-react";
import { SupportStatusPill, SupportTimeline, ageLabel, supportDateTime, type TimelineItem } from "@/app/components/shared/SupportUi";
import SelectField from "@/app/components/ui/form/SelectField";
import { canAccessSection } from "@/config/adminPermissions";
import { useAdminSupportRequest } from "@/hooks/useSupport";
import { readApiError } from "@/libs/api/errors";
import { updateAdminSupport } from "@/libs/api/support";
import { toastDone } from "@/libs/toast";
import { useAdminSession } from "@/stores/admin";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_LIMITS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  type AdminSupportRequest,
  type SupportRelated,
  type SupportStatus,
} from "@/types/support";
import { cn } from "@/utils";
import BookingDrawer from "../records/BookingDrawer";
import MembershipDrawer from "../records/MembershipDrawer";
import RecordDrawer from "../records/RecordDrawer";

const STATUS_OPTIONS = SUPPORT_STATUSES.map((value) => ({ value, label: SUPPORT_STATUS_LABELS[value] }));

const CARD = "rounded-2xl border border-tertiary/8 bg-secondary p-4 shadow-md shadow-tertiary/5 sm:p-5";

const itemsOf = (request: AdminSupportRequest): TimelineItem[] => [
  {
    key: "original",
    kind: "message",
    side: "customer",
    author: request.contact.name,
    at: request.createdAt,
    message: request.message,
    attachments: request.attachments,
  },
  ...request.events
    .filter((item) => item.type !== "created")
    .map((item, index) => ({
      key: `${index}-${item.at}`,
      kind: item.type === "status" ? ("status" as const) : ("message" as const),
      side: item.by.type === "admin" ? ("growth-hub" as const) : ("customer" as const),
      author: item.by.name,
      at: item.at,
      message: item.message,
      from: item.from,
      to: item.to,
    })),
];

const Block = ({ title, children, className }: { title: string; children: ReactNode; className?: string }) => (
  <section className={cn(CARD, className)}>
    <h3 className="text-sm font-bold text-tertiary">{title}</h3>
    <div className="mt-3">{children}</div>
  </section>
);

const UpdatePanel = ({ request, onSaved }: { request: AdminSupportRequest; onSaved: (next: AdminSupportRequest) => Promise<void> }) => {
  const [status, setStatus] = useState<SupportStatus>(request.status);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const hasReply = reply.trim().length > 0;
  const statusChanged = status !== request.status;
  const label = hasReply && statusChanged ? "Send reply and update" : hasReply ? "Send reply" : statusChanged ? "Update status" : "Save";

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!hasReply && !statusChanged) {
      setError("Write a reply, or pick a different status.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const next = await updateAdminSupport(request.ref, { ...(statusChanged && { status }), reply: reply.trim() });
      setReply("");
      setStatus(next.status);
      await onSaved(next);
      toastDone(hasReply ? "Reply sent. The customer is emailed too." : `Marked ${SUPPORT_STATUS_LABELS[status].toLowerCase()}.`);
    } catch (caught) {
      const problem = readApiError(caught);
      setError(problem.fields.reply ?? problem.fields.status ?? problem.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className={cn(CARD, "ring-1 ring-primary/10")}>
      <h3 className="text-sm font-bold text-tertiary">Update this request</h3>
      <p className="mt-0.5 text-xs text-tertiary/55">The customer is emailed about replies and status changes.</p>
      <div className="mt-4 grid grid-cols-1 gap-4">
        <SelectField label="Status" value={status} onChange={(value) => setStatus(value as SupportStatus)} options={STATUS_OPTIONS} />
        <div>
          <label htmlFor="support-reply" className="mb-1.5 block text-sm font-medium text-tertiary">
            Reply to customer
            <span className="ml-1.5 font-normal text-tertiary/45">(optional when changing the status)</span>
          </label>
          <textarea
            id="support-reply"
            rows={4}
            value={reply}
            maxLength={SUPPORT_LIMITS.messageMax}
            onChange={(event) => {
              setReply(event.target.value);
              if (error) setError(null);
            }}
            placeholder={`Hi ${request.contact.name.split(" ")[0]}, ...`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "support-update-error" : undefined}
            className="w-full resize-y rounded-xl border border-tertiary/15 bg-surface px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 hover:border-tertiary/30 focus-visible:border-primary focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
      </div>
      {error && (
        <p id="support-update-error" role="alert" className="mt-2 text-sm text-primary">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isSaving || (!hasReply && !statusChanged)}
          className="cta-gradient rounded-xl px-5 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : label}
        </button>
      </div>
    </form>
  );
};

/** One request for an admin: contact, related record, conversation and the status changer. */
const SupportDrawer = ({ requestRef, onClose, onChanged }: { requestRef: string; onClose: () => void; onChanged: () => void }) => {
  const { account } = useAdminSession();
  const { request, error, mutate } = useAdminSupportRequest(requestRef);
  const [opened, setOpened] = useState<SupportRelated | null>(null);

  if (opened?.kind === "booking") return <BookingDrawer bookingRef={opened.ref} onClose={() => setOpened(null)} onChanged={() => undefined} />;
  if (opened?.kind === "membership") {
    return <MembershipDrawer membershipRef={opened.ref} onClose={() => setOpened(null)} onChanged={() => undefined} />;
  }

  const canOpen = (related: SupportRelated) =>
    Boolean(account && canAccessSection(account, related.kind === "booking" ? "bookings" : "memberships.manage"));

  const onSaved = async (next: AdminSupportRequest) => {
    await mutate(next, { revalidate: false });
    onChanged();
  };

  return (
    <RecordDrawer
      title={requestRef}
      subtitle={request ? request.subject : "Loading..."}
      badge={request && <SupportStatusPill status={request.status} className="bg-secondary/90" />}
      onClose={onClose}
    >
      {!request ? (
        error ? (
          <p role="alert" className="rounded-xl bg-primary/8 px-4 py-6 text-center text-sm text-tertiary">
            {readApiError(error).message}
          </p>
        ) : (
          <div aria-busy="true" className="h-80 animate-pulse rounded-2xl bg-secondary" />
        )
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-tertiary ring-1 ring-tertiary/10">
              {SUPPORT_CATEGORY_LABELS[request.category]}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-tertiary/65 ring-1 ring-tertiary/10">
              {request.source === "contact-form" ? "Contact form, no account" : "From their account"}
            </span>
            <span className="text-tertiary/50">
              Raised {supportDateTime(request.createdAt)} ({ageLabel(request.createdAt)} ago)
            </span>
          </div>

          <Block title="Customer">
            <p className="font-semibold text-tertiary">{request.contact.name}</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {request.contact.email && (
                <li>
                  <a href={`mailto:${request.contact.email}`} className="inline-flex items-center gap-2 text-tertiary/75 transition-colors hover:text-primary">
                    <Mail aria-hidden="true" className="size-4 text-tertiary/40" />
                    {request.contact.email}
                  </a>
                </li>
              )}
              {request.contact.phone && (
                <li>
                  <a href={`tel:${request.contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-tertiary/75 transition-colors hover:text-primary">
                    <Phone aria-hidden="true" className="size-4 text-tertiary/40" />
                    {request.contact.phone}
                  </a>
                </li>
              )}
            </ul>
            {request.customer?.deleted && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-tertiary/6 px-2.5 py-1 text-xs text-tertiary/65">
                <UserRoundX aria-hidden="true" className="size-3.5" />
                Account deleted. These are the details given with the request.
              </p>
            )}
          </Block>

          {request.related && (
            <Block title={request.related.kind === "booking" ? "Related booking" : "Related membership"}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-tertiary">
                  {request.related.venueName} <span className="font-mono text-tertiary/55">{request.related.ref}</span>
                </p>
                {canOpen(request.related) ? (
                  <button
                    type="button"
                    onClick={() => setOpened(request.related)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-75"
                  >
                    Open {request.related.kind}
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  </button>
                ) : (
                  <span className="text-xs text-tertiary/50">
                    Needs {request.related.kind === "booking" ? "Bookings" : "Memberships"} access to open
                  </span>
                )}
              </div>
            </Block>
          )}

          <Block title="Conversation">
            <SupportTimeline items={itemsOf(request)} viewer="admin" />
          </Block>

          <UpdatePanel request={request} onSaved={onSaved} />
        </div>
      )}
    </RecordDrawer>
  );
};

export default SupportDrawer;
