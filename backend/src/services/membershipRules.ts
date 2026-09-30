import { MEMBERSHIP_RESERVE_AHEAD_DAYS } from "../constants/booking";
import type { MembershipLength, MembershipSpace, SeatType } from "../constants/catalogue";
import { MIN_AMOUNT_PAISE } from "../constants/payments";
import { AppError } from "../middlewares/error.middleware";
import type { MembershipPriceTable } from "../models";
import { addDays, instantOf } from "../utils/indiaTime";
import { toPaise, unitsFor } from "./pricing";

const MONTHS: Record<Exclude<MembershipLength, "weekly">, number> = { monthly: 1, quarterly: 3, halfYearly: 6 };

// Ten years of charges, inside Razorpay's limit for every period.
const TOTAL_COUNT: Record<MembershipLength, number> = { weekly: 520, monthly: 120, quarterly: 40, halfYearly: 20 };

const pad = (value: number) => String(value).padStart(2, "0");

/** The start of cycle n, anchored on the first day so month ends never drift. */
export const addCycles = (startDate: string, length: MembershipLength, cycles: number) => {
  if (length === "weekly") return addDays(startDate, 7 * cycles);
  const [year, month, day] = startDate.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + MONTHS[length] * cycles, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(Math.min(day, lastDay))}`;
};

/** The last day covered by cycle `index` (0 is the upfront one). */
export const cycleEnd = (startDate: string, length: MembershipLength, index: number) =>
  addDays(addCycles(startDate, length, index + 1), -1);

export const planFor = (length: MembershipLength) =>
  length === "weekly" ? { period: "weekly" as const, interval: 1 } : { period: "monthly" as const, interval: MONTHS[length] };

export const totalCountFor = (length: MembershipLength) => TOTAL_COUNT[length];

export const planKey = (period: string, interval: number, amount: number) => `${period}:${interval}:${amount}`;

export const indiaMidnightUnix = (date: string) => Math.floor(instantOf(date, 0).getTime() / 1000);

export type MembershipQuote = {
  cyclePrice: number;
  units: number;
  firstCycle: { discount: number; total: number; payable: number; minimumApplied: boolean };
};

const unavailable = () => new AppError("This venue doesn't sell that plan.", 422, "PRICE_UNAVAILABLE");

export const quoteMembership = (input: {
  venue: { membershipPrices: MembershipPriceTable };
  spaceType: SeatType;
  length: MembershipLength;
  people: number;
}): MembershipQuote => {
  if (input.spaceType === "meeting-room") throw unavailable();
  const price = input.venue.membershipPrices[input.spaceType as MembershipSpace]?.[input.length];
  if (!price) throw unavailable();
  const units = unitsFor(input.spaceType, input.people);
  const cyclePrice = toPaise(price) * units;
  const discount = 0;
  const total = Math.max(cyclePrice - discount, 0);
  const payable = total === 0 ? 0 : Math.max(total, MIN_AMOUNT_PAISE);
  return { cyclePrice, units, firstCycle: { discount, total, payable, minimumApplied: payable !== total } };
};

/** The last day a renewing plan keeps: its first two cycles, or past the pass horizon if that is later. */
export const reserveThrough = (startDate: string, length: MembershipLength, today: string) => {
  const cycles = cycleEnd(startDate, length, 1);
  const horizon = addDays(today, MEMBERSHIP_RESERVE_AHEAD_DAYS);
  return cycles > horizon ? cycles : horizon;
};
