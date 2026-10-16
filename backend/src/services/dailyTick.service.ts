import { runAddonOrderTick } from "./addonOrder.service";
import { expireLapsedBookings, finishPastBookings, removeOldSeatDays } from "./booking.service";
import { endStoppedMemberships, expireLapsedMemberships, extendRenewingReservations } from "./membership.service";
import { markPayable } from "./payable.service";
import { draftLastMonth } from "./payout.service";

/** Every 10 minutes: keeps statuses and venue earnings current. Seats free themselves without it. */
export const runFrequentTick = async (now: Date) => ({
  expired: await expireLapsedBookings(now),
  finished: await finishPastBookings(now),
  expiredMemberships: await expireLapsedMemberships(now),
  endedMemberships: await endStoppedMemberships(now),
  ...(await runAddonOrderTick(now)),
  payable: await markPayable(now),
});

/** Once a day: work tied to calendar days, and last month's statements once cancellations have settled. */
export const runDailyTick = async (now: Date) => ({
  extendedMemberships: await extendRenewingReservations(now),
  removedSeatDays: await removeOldSeatDays(now),
  ...(await draftLastMonth(now)),
});
