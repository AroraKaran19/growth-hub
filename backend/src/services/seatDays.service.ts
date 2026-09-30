import type { ClientSession, Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import { SeatDay, type SeatDayDoc, type SeatRange } from "../models";

const DUPLICATE_KEY = 11000;
const WHOLE_DAY = { start: 0, end: 24 * 60 };

const isLive = (range: SeatRange, now: Date) => !range.holdExpiresAt || range.holdExpiresAt > now;

const overlaps = (range: { start: number; end: number }, start: number, end: number) =>
  range.start < end && range.end > start;

const seatTaken = (seatIds: string[], dates: string[]) =>
  new AppError("Someone has just taken one of those seats. Pick another.", 409, "SEAT_TAKEN", {
    seatIds,
    dates,
  });

type DayState = Pick<SeatDayDoc, "ranges" | "membershipId" | "membershipHoldExpiresAt">;

const isReserved = (day: Pick<DayState, "membershipId" | "membershipHoldExpiresAt">, now: Date) =>
  Boolean(day.membershipId) && (!day.membershipHoldExpiresAt || day.membershipHoldExpiresAt > now);

const blocks = (day: DayState, start: number, end: number, now: Date) =>
  isReserved(day, now) || day.ranges.some((range) => isLive(range, now) && overlaps(range, start, end));

const liveRange = (now: Date) => ({ $or: [{ holdExpiresAt: null }, { holdExpiresAt: { $gt: now } }] });

/** Matches a day nobody's membership holds, or whose hold has lapsed. */
const notReservedBy = (now: Date, except?: Types.ObjectId) => ({
  $or: [
    { membershipId: null },
    { membershipHoldExpiresAt: { $ne: null, $lte: now } },
    ...(except ? [{ membershipId: except }] : []),
  ],
});

const isDuplicateKey = (error: unknown) => {
  const failure = error as { code?: unknown; writeErrors?: { code?: unknown }[] };
  return failure.code === DUPLICATE_KEY || Boolean(failure.writeErrors?.some((item) => item.code === DUPLICATE_KEY));
};

export type ClaimInput = {
  venueId: Types.ObjectId;
  date: string;
  seatIds: string[];
  start: number;
  end: number;
  /** Null for a walk-in, which belongs to no booking. */
  bookingId: Types.ObjectId | null;
  holdExpiresAt: Date | null;
  kind?: SeatRange["kind"];
};

/** Claims a window on every seat, or throws SEAT_TAKEN. Run inside a transaction. */
export const claimRanges = async (input: ClaimInput, session: ClientSession) => {
  const now = new Date();
  const { venueId, date, seatIds, start, end } = input;

  // Read first so the error can name every seat that is taken, not just the first.
  const existing = await SeatDay.find({ venueId, date, seatId: { $in: seatIds } })
    .session(session)
    .lean<SeatDayDoc[]>();
  const taken = existing.filter((day) => blocks(day, start, end, now)).map((day) => day.seatId);
  if (taken.length) throw seatTaken(taken.sort(), [date]);

  const range: SeatRange = {
    start,
    end,
    kind: input.kind ?? "booking",
    bookingId: input.bookingId,
    holdExpiresAt: input.holdExpiresAt,
  };

  for (const seatId of seatIds) {
    await SeatDay.updateOne(
      { venueId, seatId, date },
      { $pull: { ranges: { holdExpiresAt: { $ne: null, $lte: now } } } },
      { session },
    );
    try {
      const claimed = await SeatDay.findOneAndUpdate(
        {
          venueId,
          seatId,
          date,
          ...notReservedBy(now),
          ranges: { $not: { $elemMatch: { start: { $lt: end }, end: { $gt: start }, ...liveRange(now) } } },
        },
        { $push: { ranges: range } },
        { upsert: true, returnDocument: "after", session },
      );
      if (!claimed) throw seatTaken([seatId], [date]);
    } catch (error) {
      // An existing record that fails the filter makes the upsert collide with it.
      if (isDuplicateKey(error)) throw seatTaken([seatId], [date]);
      throw error;
    }
  }
};

export type ReserveInput = {
  venueId: Types.ObjectId;
  seatIds: string[];
  dates: string[];
  membershipId: Types.ObjectId;
  holdExpiresAt: Date | null;
};

const MAX_NAMED_DATES = 10;

/** Holds whole days for a membership, all or nothing. Run inside a transaction. */
export const reserveDays = async (input: ReserveInput, session: ClientSession) => {
  const now = new Date();
  const { venueId, seatIds, dates, membershipId, holdExpiresAt } = input;

  const existing = await SeatDay.find({ venueId, seatId: { $in: seatIds }, date: { $in: dates } })
    .session(session)
    .lean<SeatDayDoc[]>();
  const conflicts = existing.filter(
    (day) =>
      (isReserved(day, now) && !day.membershipId?.equals(membershipId)) ||
      day.ranges.some((range) => isLive(range, now)),
  );
  if (conflicts.length) {
    throw seatTaken(
      [...new Set(conflicts.map((day) => day.seatId))].sort(),
      [...new Set(conflicts.map((day) => day.date))].sort().slice(0, MAX_NAMED_DATES),
    );
  }

  await SeatDay.updateMany(
    { venueId, seatId: { $in: seatIds }, date: { $in: dates } },
    { $pull: { ranges: { holdExpiresAt: { $ne: null, $lte: now } } } },
    { session },
  );
  const ops = seatIds.flatMap((seatId) =>
    dates.map((date) => ({
      updateOne: {
        filter: {
          venueId,
          seatId,
          date,
          ...notReservedBy(now, membershipId),
          ranges: { $not: { $elemMatch: liveRange(now) } },
        },
        update: { $set: { membershipId, membershipHoldExpiresAt: holdExpiresAt } },
        upsert: true,
      },
    })),
  );
  try {
    await SeatDay.bulkWrite(ops, { session, ordered: true });
  } catch (error) {
    if (isDuplicateKey(error)) throw seatTaken(seatIds, dates.slice(0, MAX_NAMED_DATES));
    throw error;
  }
};

export type SeatDate = { seatId: string; date: string };

/** Holds every free day for a membership for good and reports the ones someone else has. */
export const reserveFreeDays = async (
  input: Omit<ReserveInput, "holdExpiresAt">,
  session: ClientSession,
): Promise<SeatDate[]> => {
  const now = new Date();
  const { venueId, seatIds, dates, membershipId } = input;
  if (!dates.length) return [];

  const existing = await SeatDay.find({ venueId, seatId: { $in: seatIds }, date: { $in: dates } })
    .session(session)
    .lean<SeatDayDoc[]>();
  const taken = new Set(
    existing
      .filter(
        (day) =>
          (isReserved(day, now) && !day.membershipId?.equals(membershipId)) ||
          day.ranges.some((range) => isLive(range, now)),
      )
      .map((day) => `${day.seatId}|${day.date}`),
  );
  const skipped = [...taken].map((key) => {
    const [seatId, date] = key.split("|");
    return { seatId, date };
  });
  const free = seatIds.flatMap((seatId) =>
    dates.filter((date) => !taken.has(`${seatId}|${date}`)).map((date) => ({ seatId, date })),
  );
  if (!free.length) return skipped;

  await SeatDay.updateMany(
    { venueId, seatId: { $in: seatIds }, date: { $in: dates } },
    { $pull: { ranges: { holdExpiresAt: { $ne: null, $lte: now } } } },
    { session },
  );
  // Inside a transaction a collision aborts everything, so a race here fails the whole extension.
  await SeatDay.bulkWrite(
    free.map(({ seatId, date }) => ({
      updateOne: {
        filter: {
          venueId,
          seatId,
          date,
          ...notReservedBy(now, membershipId),
          ranges: { $not: { $elemMatch: liveRange(now) } },
        },
        update: { $set: { membershipId, membershipHoldExpiresAt: null } },
        upsert: true,
      },
    })),
    { session, ordered: true },
  );
  return skipped;
};

/** Moves an unpaid membership's hold on all its days; null makes them permanent. */
export const setDayHold = (membershipId: Types.ObjectId, holdExpiresAt: Date | null, session?: ClientSession) =>
  SeatDay.updateMany({ membershipId }, { $set: { membershipHoldExpiresAt: holdExpiresAt } }, { session });

/** Frees a membership's days, all of them or those from a date on. */
export const releaseDays = (membershipId: Types.ObjectId, fromDate?: string, session?: ClientSession) =>
  SeatDay.updateMany(
    { membershipId, ...(fromDate && { date: { $gte: fromDate } }) },
    { $set: { membershipId: null, membershipHoldExpiresAt: null } },
    { session },
  );

export const releaseRanges = (bookingId: Types.ObjectId, session?: ClientSession) =>
  SeatDay.updateMany({ "ranges.bookingId": bookingId }, { $pull: { ranges: { bookingId } } }, { session });

/** Moves the hold on every range of a booking; null makes the ranges permanent. */
export const setHold = (bookingId: Types.ObjectId, holdExpiresAt: Date | null, session?: ClientSession) =>
  SeatDay.updateMany(
    { "ranges.bookingId": bookingId },
    { $set: { "ranges.$[range].holdExpiresAt": holdExpiresAt } },
    { arrayFilters: [{ "range.bookingId": bookingId }], session },
  );

/** Live ranges per seat for a day; a membership reservation covers the whole day. */
export const dayRanges = async (venueId: Types.ObjectId, date: string, now: Date) => {
  const days = await SeatDay.find({ venueId, date }).lean<SeatDayDoc[]>();
  const bySeat = new Map<string, { start: number; end: number; bookingId: string | null }[]>();
  for (const day of days) {
    const live = isReserved(day, now)
      ? [{ ...WHOLE_DAY, bookingId: null }]
      : day.ranges
          .filter((range) => isLive(range, now))
          .map((range) => ({ start: range.start, end: range.end, bookingId: range.bookingId?.toString() ?? null }));
    if (live.length) bySeat.set(day.seatId, live);
  }
  return bySeat;
};

export const takenSeatIds = async (venueId: Types.ObjectId, date: string, start: number, end: number, now: Date) => {
  const bySeat = await dayRanges(venueId, date, now);
  return [...bySeat]
    .filter(([, ranges]) => ranges.some((range) => overlaps(range, start, end)))
    .map(([seatId]) => seatId)
    .sort();
};
