import type { RequestSummary } from "@/types/cancellation";
import { rupees } from "../Booking/checkoutState";

export type RequestNotice = { tone: "waiting" | "approved" | "declined"; text: string };

/** What the member should read about their latest request, or null when there is nothing to say. */
export const requestNotice = (request: RequestSummary | null): RequestNotice | null => {
  if (!request) return null;
  switch (request.status) {
    case "open":
      return {
        tone: "waiting",
        text: "Cancellation requested. Everything stays as it is until the venue decides.",
      };
    case "approved":
      return {
        tone: "approved",
        text: request.refundAmount
          ? `Cancellation approved. The venue will refund ${rupees(request.refundAmount)} to you directly.`
          : "Cancellation approved. The venue did not offer a refund.",
      };
    case "rejected":
      return { tone: "declined", text: `Cancellation declined: ${request.decisionNote}` };
    default:
      return null;
  }
};

/** Still active, and no request is waiting or already approved. */
export const canAskToCancel = (status: string, request: RequestSummary | null) =>
  (status === "upcoming" || status === "active" || status === "past-due") &&
  request?.status !== "open" &&
  request?.status !== "approved";
