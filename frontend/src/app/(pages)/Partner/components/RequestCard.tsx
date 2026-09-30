"use client";

import { CalendarClock, Crown, PackagePlus, Phone, Ticket } from "lucide-react";
import { REASON_LABELS, REQUEST_STATUS_LABELS, type CancellationRequest } from "@/types/cancellation";
import { cn } from "@/utils";
import { rupees, startsLabel, urgencyFor } from "../requestRules";

const KIND_ICONS = { booking: Ticket, membership: Crown, "addon-order": PackagePlus } as const;

type RequestCardProps = {
  request: CancellationRequest;
  now: Date;
  /** Admins see many venues, so the card names it. */
  showVenue?: boolean;
  onApprove?: (request: CancellationRequest) => void;
  onReject?: (request: CancellationRequest) => void;
};

const DECIDED_STYLE: Record<CancellationRequest["status"], string> = {
  open: "bg-amber-500/15 text-amber-800",
  approved: "bg-green-500/12 text-green-700",
  rejected: "bg-tertiary/8 text-tertiary/70",
  withdrawn: "bg-tertiary/8 text-tertiary/60",
};

const RequestCard = ({ request, now, showVenue = false, onApprove, onReject }: RequestCardProps) => {
  const isOpen = request.status === "open";
  const urgency = isOpen ? urgencyFor(request, now) : null;
  const KindIcon = KIND_ICONS[request.kind];

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-secondary p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6",
        urgency ? "border-primary/30" : "border-tertiary/10",
      )}
    >
      {urgency && <span aria-hidden="true" className="cta-gradient absolute inset-y-0 left-0 w-1" />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tertiary text-secondary">
            <KindIcon aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-base font-bold text-tertiary">{request.member.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tertiary/60">
              <span className="font-mono">{request.ref}</span>
              {request.member.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone aria-hidden="true" className="size-3.5" />
                  {request.member.phone}
                </span>
              )}
              {showVenue && <span>{request.venue.name}</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {urgency === "started" && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-secondary">Already started</span>
          )}
          {urgency === "urgent" && (
            <span className="rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">Starts within a day</span>
          )}
          {request.systemOpened && (
            <span className="rounded-full bg-tertiary px-2.5 py-1 text-xs font-medium text-secondary">Refund owed</span>
          )}
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", DECIDED_STYLE[request.status])}>
            {REQUEST_STATUS_LABELS[request.status]}
          </span>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-surface px-4 py-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-tertiary/50">{request.kind === "membership" ? "Plan started" : request.kind === "booking" ? "Starts" : "First day"}</dt>
          <dd className="mt-1 inline-flex items-center gap-1.5 text-sm text-tertiary">
            <CalendarClock aria-hidden="true" className="size-3.5 text-primary" />
            {startsLabel(request.startsAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-tertiary/50">Paid</dt>
          <dd className="mt-1 text-sm font-semibold text-tertiary">{rupees(request.paid)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-tertiary/50">Reason</dt>
          <dd className="mt-1 text-sm text-tertiary">{REASON_LABELS[request.reason]}</dd>
        </div>
      </dl>

      {request.details && (
        <p className="mt-3 rounded-lg border-l-2 border-tertiary/15 pl-3 text-sm text-tertiary/75">
          &ldquo;{request.details}&rdquo;
        </p>
      )}

      {!isOpen && request.status !== "withdrawn" && (
        <p className="mt-4 text-sm text-tertiary/70">
          {request.status === "approved"
            ? `Refund ${rupees(request.refundAmount ?? 0)}`
            : "Declined"}
          {request.decidedBy && ` by ${request.decidedBy.name}`}
          {request.decisionNote && `: ${request.decisionNote}`}
        </p>
      )}

      {isOpen && (onApprove || onReject) && (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-4 border-t border-tertiary/8 pt-4">
          {onReject && !request.systemOpened && (
            <button
              type="button"
              onClick={() => onReject(request)}
              className="text-sm font-medium text-tertiary/65 underline underline-offset-4 transition-colors hover:text-tertiary"
            >
              Decline
            </button>
          )}
          {onApprove && (
            <button
              type="button"
              onClick={() => onApprove(request)}
              className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90"
            >
              Approve and set refund
            </button>
          )}
        </div>
      )}
    </article>
  );
};

export default RequestCard;
