import { env } from "../config/env";
import type { BookedSeat, DailyWindow, MembershipDoc, SeatHolder } from "../models";
import { addDays, indiaNow } from "../utils/indiaTime";
import { signCode } from "../utils/qr";

export type PlanSnapshotView = {
  id: string;
  name: string;
  space: string;
  roomMode: string | null;
  slotHours: number | null;
  days: number[];
};

export type MembershipView = {
  ref: string;
  status: string;
  venue: { slug: string; name: string; locality: string; city: string; image: string };
  spaceType: string;
  /** Null for memberships bought before plans existed; they cover every day. */
  plan: PlanSnapshotView | null;
  window: DailyWindow | null;
  holders: SeatHolder[];
  length: string;
  seats: BookedSeat[];
  people: number;
  /** Paise per cycle. */
  cyclePrice: number;
  firstCycle: MembershipDoc["firstCycle"];
  startDate: string;
  paidThrough: string | null;
  /** The next charge date, or null when the plan will not renew. */
  renewsOn: string | null;
  cancelAtCycleEnd: boolean;
  hasOpenRequest: boolean;
  /** Razorpay's page for fixing a failed renewal; only while past due. */
  updatePaymentUrl: string | null;
  holdExpiresAt: string | null;
  holdCapAt: string | null;
  /** The QR the member shows at reception while the plan is live. */
  memberPass: string | null;
  createdAt: string;
};

/** The status a membership has now, even if the tidy-up job has not run. */
export const effectiveMembershipStatus = (membership: MembershipDoc, now: Date) => {
  if (membership.status === "pending-payment") {
    return membership.holdExpiresAt && membership.holdExpiresAt <= now ? "expired" : "pending-payment";
  }
  const today = indiaNow(now).date;
  const isLive = membership.status === "active" || membership.status === "past-due";
  if (isLive && membership.cancelAtCycleEnd && membership.paidThrough && membership.paidThrough < today) return "ended";
  return membership.status;
};

const iso = (value: Date | null) => (value ? new Date(value).toISOString() : null);

export const planSnapshotView = (membership: Pick<MembershipDoc, "plan">): PlanSnapshotView | null => {
  const plan = membership.plan;
  if (!plan) return null;
  return { id: plan.id.toString(), name: plan.name, space: plan.space, roomMode: plan.roomMode, slotHours: plan.slotHours, days: plan.days };
};

export const windowView = (membership: Pick<MembershipDoc, "window">): DailyWindow | null =>
  membership.window ? { start: membership.window.start, end: membership.window.end } : null;

export const holdersView = (membership: Pick<MembershipDoc, "holders">): SeatHolder[] =>
  (membership.holders ?? []).map((holder) => ({ seatId: holder.seatId, name: holder.name }));

export const toMembershipView = (membership: MembershipDoc, now = new Date()): MembershipView => {
  const status = effectiveMembershipStatus(membership, now);
  const isLive = status === "active" || status === "past-due";
  const secret = env().qrSigningSecret;
  return {
    ref: membership.ref,
    status,
    venue: { slug: membership.venueSlug, ...membership.venue },
    spaceType: membership.spaceType,
    plan: planSnapshotView(membership),
    window: windowView(membership),
    holders: holdersView(membership),
    length: membership.length,
    seats: membership.seats,
    people: membership.people,
    cyclePrice: membership.cyclePrice,
    firstCycle: membership.firstCycle,
    startDate: membership.startDate,
    paidThrough: membership.paidThrough,
    renewsOn: isLive && !membership.cancelAtCycleEnd && membership.paidThrough ? addDays(membership.paidThrough, 1) : null,
    cancelAtCycleEnd: membership.cancelAtCycleEnd,
    hasOpenRequest: Boolean(membership.openRequestId),
    updatePaymentUrl: status === "past-due" ? (membership.razorpay.shortUrl ?? null) : null,
    holdExpiresAt: status === "pending-payment" ? iso(membership.holdExpiresAt) : null,
    holdCapAt: status === "pending-payment" ? iso(membership.holdCapAt) : null,
    memberPass: isLive && secret ? signCode("m", membership.ref, secret) : null,
    createdAt: new Date(membership.createdAt).toISOString(),
  };
};
