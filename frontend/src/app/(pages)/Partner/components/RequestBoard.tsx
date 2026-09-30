"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import type { CancellationRequest, Decision } from "@/types/cancellation";
import { cn } from "@/utils";
import DecisionModal from "./DecisionModal";
import RequestCard from "./RequestCard";

type RequestBoardProps = {
  tab: "open" | "decided";
  onTabChange: (tab: "open" | "decided") => void;
  openCount: number;
  requests: CancellationRequest[];
  isLoading: boolean;
  hasError: boolean;
  showVenue?: boolean;
  onDecide: (request: CancellationRequest, decision: Decision) => Promise<unknown>;
};

const TABS = [
  { value: "open", label: "Waiting" },
  { value: "decided", label: "Decided" },
] as const;

/** Open and decided cancellation requests, with the decision modal; shared by partners and admins. */
const RequestBoard = ({ tab, onTabChange, openCount, requests, isLoading, hasError, showVenue, onDecide }: RequestBoardProps) => {
  const [deciding, setDeciding] = useState<{ request: CancellationRequest; mode: "approve" | "reject" } | null>(null);
  // Read once per render; urgency only needs minute precision.
  const [now] = useState(() => new Date());

  return (
    <>
      <div role="tablist" aria-label="Requests" className="inline-flex rounded-full bg-tertiary/6 p-1">
        {TABS.map((item) => (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={tab === item.value}
            onClick={() => onTabChange(item.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === item.value ? "bg-secondary text-tertiary shadow-sm" : "text-tertiary/60 hover:text-tertiary",
            )}
          >
            {item.label}
            {item.value === "open" && openCount > 0 && (
              <span className="cta-gradient rounded-full px-2 py-0.5 text-xs font-semibold text-secondary">{openCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {isLoading ? (
          <div className="h-48 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
        ) : hasError ? (
          <p className="rounded-2xl border border-tertiary/10 bg-secondary px-6 py-14 text-center text-sm text-tertiary/60">
            We couldn&apos;t load requests. Check your connection; this page retries on its own.
          </p>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-tertiary/15 bg-secondary px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-tertiary/5 text-tertiary/50">
              <Inbox aria-hidden="true" className="size-6" />
            </span>
            <p className="mt-4 text-sm font-semibold text-tertiary">
              {tab === "open" ? "Nothing waiting for a decision" : "No decisions yet"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-tertiary/55">
              {tab === "open"
                ? "When a member asks to cancel, the request lands here, soonest start first."
                : "Approved and declined requests are kept here for your records."}
            </p>
          </div>
        ) : (
          requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              now={now}
              showVenue={showVenue}
              onApprove={(item) => setDeciding({ request: item, mode: "approve" })}
              onReject={(item) => setDeciding({ request: item, mode: "reject" })}
            />
          ))
        )}
      </div>

      {deciding && (
        <DecisionModal
          request={deciding.request}
          mode={deciding.mode}
          onClose={() => setDeciding(null)}
          onDecide={async (decision) => {
            await onDecide(deciding.request, decision);
            setDeciding(null);
          }}
        />
      )}
    </>
  );
};

export default RequestBoard;
