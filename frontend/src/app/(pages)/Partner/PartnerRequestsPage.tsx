"use client";

import { useState } from "react";
import { usePartnerRequests } from "@/hooks/useCancellationRequests";
import { decidePartnerRequest } from "@/libs/api/cancellations";
import RequestBoard from "./components/RequestBoard";
import { PartnerPageHeader, PartnerStat } from "./components/PartnerUi";
import { rupees, urgencyFor } from "./requestRules";

const PartnerRequestsPage = () => {
  const [tab, setTab] = useState<"open" | "decided">("open");
  const open = usePartnerRequests("open");
  const decided = usePartnerRequests("decided");
  const shown = tab === "open" ? open : decided;
  const [now] = useState(() => new Date());

  const urgent = open.requests.filter((request) => urgencyFor(request, now)).length;
  const refunded = decided.requests
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + (request.refundAmount ?? 0), 0);

  return (
    <>
      <PartnerPageHeader
        title="Cancellation requests"
        description="Members ask, you decide. If you approve, set the refund you will pay the member back yourself."
      />

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PartnerStat label="Waiting" value={String(open.requests.length)} />
        <PartnerStat label="Start within a day" value={String(urgent)} hint="Decide these first" />
        <PartnerStat label="Refunds agreed" value={rupees(refunded)} hint="Across decided requests shown" />
      </dl>

      <div className="mt-6">
        <RequestBoard
          tab={tab}
          onTabChange={setTab}
          openCount={open.requests.length}
          requests={shown.requests}
          isLoading={shown.isLoading}
          hasError={Boolean(shown.error)}
          onDecide={async (request, decision) => {
            await decidePartnerRequest(request.id, decision);
            await Promise.all([open.mutate(), decided.mutate()]);
          }}
        />
      </div>
    </>
  );
};

export default PartnerRequestsPage;
