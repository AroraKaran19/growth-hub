import { REASON_LABELS, REQUEST_STATUS_LABELS, type CancellationRequest } from "@/types/cancellation";
import { cn } from "@/utils";
import { rupees, startsLabel } from "../../../Partner/requestRules";

const STYLE: Record<CancellationRequest["status"], string> = {
  open: "bg-amber-500/15 text-amber-800",
  approved: "bg-green-500/12 text-green-700",
  rejected: "bg-tertiary/8 text-tertiary/70",
  withdrawn: "bg-tertiary/8 text-tertiary/60",
};

/** Every cancellation request on one booking or plan, newest first. */
const RequestHistory = ({ requests }: { requests: CancellationRequest[] }) =>
  requests.length === 0 ? (
    <p className="text-sm text-tertiary/55">No cancellation requests.</p>
  ) : (
    <ol className="flex flex-col gap-3">
      {requests.map((request) => (
        <li key={request.id} className="rounded-xl border border-tertiary/10 bg-secondary px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-tertiary">{REASON_LABELS[request.reason]}</p>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STYLE[request.status])}>
              {REQUEST_STATUS_LABELS[request.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-tertiary/55">
            Asked {startsLabel(request.createdAt)}
            {request.systemOpened && " by Growth Hub"}
          </p>
          {request.details && <p className="mt-2 text-sm text-tertiary/75">&ldquo;{request.details}&rdquo;</p>}
          {request.decidedBy && (
            <p className="mt-2 text-sm text-tertiary/70">
              {request.status === "approved" ? `Refund ${rupees(request.refundAmount ?? 0)}` : "Declined"} by{" "}
              {request.decidedBy.name}
              {request.decisionNote && `: ${request.decisionNote}`}
            </p>
          )}
        </li>
      ))}
    </ol>
  );

export default RequestHistory;
