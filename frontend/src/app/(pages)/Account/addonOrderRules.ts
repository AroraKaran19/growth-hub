import type { RequestSummary } from "@/types/cancellation";
import type { AddonUnit, VenueAddonOffer } from "@/types/catalogue";
import { formatMonthDay } from "@/utils/date";
import { isOpenOn, type DayHours } from "@/utils/venueHours";

/** Matches the server's limit on days per order. */
export const MAX_ADDON_DAYS = 31;

const DAY_MS = 24 * 60 * 60 * 1000;

const utcOf = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

const isoOfUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Open days from today through the last paid day, as the server allows them. */
export const addonDays = (hours: DayHours[], today: string, paidThrough: string | null, max = MAX_ADDON_DAYS) => {
  if (!paidThrough || paidThrough < today) return [];
  const days: string[] = [];
  for (let ms = utcOf(today); ms <= utcOf(paidThrough) && days.length < max; ms += DAY_MS) {
    if (isOpenOn(hours, isoOfUtc(ms))) days.push(isoOfUtc(ms));
  }
  return days;
};

export const ORDER_UNIT_SUFFIX: Record<AddonUnit, string> = {
  "per-person": " per person, per day",
  "per-day": " per day",
  "per-booking": " per order",
};

export type AddonOrderLine ={ key: string; name: string; unit: AddonUnit; quantity: number; amount: number };

/** The same sums the server charges, in paise. */
export const addonOrderLines = (offers: VenueAddonOffer[], keys: string[], people: number, days: number) =>
  keys.flatMap((key): AddonOrderLine[] => {
    const offer = offers.find((item) => item.key === key);
    if (!offer) return [];
    const quantity = offer.unit === "per-booking" ? 1 : offer.unit === "per-person" ? people * days : days;
    return [{ key, name: offer.name, unit: offer.unit, quantity, amount: Math.round(offer.price * 100) * quantity }];
  });

export const canBuyAddons = (
  membership: { status: string; paidThrough: string | null },
  offers: VenueAddonOffer[],
  today: string,
) =>
  (membership.status === "active" || membership.status === "past-due") &&
  Boolean(membership.paidThrough && membership.paidThrough >= today) &&
  offers.length > 0;

/** "Oct 6, Oct 7" for a few days, "12 days, Oct 6 to Nov 2" for more. */
export const datesLabel = (dates: string[]) => {
  const sorted = [...dates].sort();
  if (sorted.length <= 3) return sorted.map(formatMonthDay).join(", ");
  return `${sorted.length} days, ${formatMonthDay(sorted[0])} to ${formatMonthDay(sorted.at(-1)!)}`;
};

type ListedOrder = { status: string; dates: string[]; request?: RequestSummary | null; venueRemoval?: unknown };

/** Paid orders with a day still ahead, plus cancelled ones whose request the member should hear about. */
export const upcomingAddonOrders = <T extends ListedOrder>(orders: T[], today: string) =>
  orders.filter((order) =>
    order.status === "paid"
      ? order.dates.some((date) => date >= today)
      : order.status === "cancelled" &&
        (order.request?.status === "approved" || Boolean(order.venueRemoval)) &&
        order.dates.some((date) => date >= today),
  );

/** A payment still settling is confirmed by the webhook; anything else needs a fresh order. */
export const afterConfirmFailure = (code: string | undefined) => (code === "PAYMENT_INCOMPLETE" ? "wait" : "start-over");
