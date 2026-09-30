const URGENT_MS = 24 * 60 * 60 * 1000;

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** "started" once the start has passed, "urgent" within a day of it. */
export const urgencyOf = (startsAt: string, now: Date) => {
  const left = Date.parse(startsAt) - now.getTime();
  if (left < 0) return "started";
  return left <= URGENT_MS ? "urgent" : null;
};

/** Passes and add-ons have a start to beat; a plan request has no deadline. */
export const urgencyFor = (request: { kind: string; startsAt: string }, now: Date) =>
  request.kind === "membership" ? null : urgencyOf(request.startsAt, now);

/** The venue types rupees; the API takes paise, never more than the member paid. */
export const refundPaise = (input: string, maxPaise: number): { paise: number; error?: string } => {
  const text = input.replace(/[₹,\s]/g, "");
  if (!text) return { paise: 0, error: "Enter a refund amount, or 0 for none." };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { paise: 0, error: "Enter an amount in rupees, like 500 or 499.50." };
  const paise = Math.round(Number(text) * 100);
  if (paise > maxPaise) return { paise, error: `The most you can refund is ${rupees(maxPaise)}, what the member paid.` };
  return { paise };
};

const IST_OFFSET_MS = 330 * 60_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Tue 6 Oct, 10:00 AM" in India time, whatever the viewer's zone. */
export const startsLabel = (startsAt: string) => {
  const india = new Date(Date.parse(startsAt) + IST_OFFSET_MS);
  const hours = india.getUTCHours();
  const minutes = String(india.getUTCMinutes()).padStart(2, "0");
  const clock = `${hours % 12 || 12}:${minutes} ${hours >= 12 ? "PM" : "AM"}`;
  return `${WEEKDAYS[india.getUTCDay()]} ${india.getUTCDate()} ${MONTHS[india.getUTCMonth()]}, ${clock}`;
};

export const KIND_LABELS = { booking: "Pass", membership: "Membership", "addon-order": "Add-ons" } as const;
