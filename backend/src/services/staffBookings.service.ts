import type { QueryFilter, Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import { Booking, Member, type BookingDoc, type MemberDoc } from "../models";
import { addDays, indiaNow, isIsoDate, timeLabel } from "../utils/indiaTime";
import { canonicalRef, isRef } from "../utils/refs";
import { escapeRegex } from "../utils/regex";
import { deletedMemberIdsMatching, findMembers } from "./accountSnapshot.service";
import { effectiveStatus } from "./bookingRules";

const HIDDEN = ["pending-payment", "expired"];
const PARTNER_LIMIT = 500;
const ADMIN_LIMIT = 200;
const DEFAULT_PAST_DAYS = 30;
const DEFAULT_AHEAD_DAYS = 90;

export type StaffBookingView = {
  ref: string;
  status: string;
  venue: { slug: string; name: string };
  member: { name: string; phone: string };
  seats: string[];
  spaceType: string;
  passType: string;
  date: string;
  startMin: number;
  endMin: number;
  timeLabel: string;
  people: number;
  addons: { name: string; amount: number }[];
  /** Paise. */
  total: number;
  invoiceNumber: string | null;
  rescheduleCount: number;
  checkedInAt: string | null;
  extras: { preference: string };
};

export const phoneOf = (member: MemberDoc) =>
  member.countryCode === "+91" && member.phoneNumber.length === 10
    ? `+91 ${member.phoneNumber.slice(0, 5)} ${member.phoneNumber.slice(5)}`
    : `${member.countryCode} ${member.phoneNumber}`;

export const toStaffBookingViews = async (bookings: BookingDoc[], now: Date): Promise<StaffBookingView[]> => {
  const members = await findMembers(bookings.map((booking) => booking.memberId));
  const byId = new Map(members.map((member) => [member._id.toString(), member]));
  return bookings.map((booking) => {
    const member = byId.get(booking.memberId.toString());
    return {
      ref: booking.ref,
      status: effectiveStatus(booking, now),
      venue: { slug: booking.venueSlug, name: booking.venue.name },
      member: { name: member?.name ?? "Member", phone: member ? phoneOf(member) : "" },
      seats: booking.seats.map((seat) => seat.label),
      spaceType: booking.spaceType,
      passType: booking.passType,
      date: booking.date,
      startMin: booking.startMin,
      endMin: booking.endMin,
      timeLabel: `${timeLabel(booking.startMin)} - ${timeLabel(booking.endMin)}`,
      people: booking.people,
      addons: booking.addons.map((line) => ({ name: line.name, amount: line.amount })),
      total: booking.price.payable,
      invoiceNumber: booking.invoiceNumber,
      rescheduleCount: booking.rescheduleCount,
      checkedInAt: booking.checkedInAt ? new Date(booking.checkedInAt).toISOString() : null,
      extras: { preference: booking.extras?.preference ?? "none" },
    };
  });
};

const badDate = () => new AppError("Use dates like 2026-10-06.", 400, "VALIDATION_FAILED", { fields: { date: "Use a real date." } });

const readRange = (from: unknown, to: unknown) => {
  const today = indiaNow().date;
  const start = from === undefined ? addDays(today, -DEFAULT_PAST_DAYS) : from;
  const end = to === undefined ? addDays(today, DEFAULT_AHEAD_DAYS) : to;
  if (!isIsoDate(start) || !isIsoDate(end)) throw badDate();
  return { start, end };
};

/** Paid bookings at one venue; the slug always comes from the signed-in partner. */
export const listVenueBookings = async (venueSlug: string, query: { from?: unknown; to?: unknown }) => {
  const { start, end } = readRange(query.from, query.to);
  const bookings = await Booking.find({ venueSlug, status: { $nin: HIDDEN as BookingDoc["status"][] }, date: { $gte: start, $lte: end } })
    .sort({ date: 1, startMin: 1 })
    .limit(PARTNER_LIMIT)
    .lean<BookingDoc[]>();
  return toStaffBookingViews(bookings, new Date());
};

const membersMatching = async (search: string): Promise<Types.ObjectId[]> => {
  const digits = search.replace(/\D/g, "");
  const looksLikePhone = /^[\d\s+()-]+$/.test(search) && digits.length >= 4;
  const filter: QueryFilter<MemberDoc> = looksLikePhone
    ? { phoneE164: { $regex: escapeRegex(digits) } }
    : { name: { $regex: escapeRegex(search), $options: "i" } };
  const [live, deleted] = await Promise.all([
    Member.find(filter, { _id: 1 }).limit(ADMIN_LIMIT).lean<{ _id: Types.ObjectId }[]>(),
    deletedMemberIdsMatching(filter),
  ]);
  return [...live.map((member) => member._id), ...deleted];
};

export type AdminBookingQuery = { venue?: unknown; status?: unknown; from?: unknown; to?: unknown; q?: unknown };

export const listAdminBookings = async (query: AdminBookingQuery) => {
  const filter: QueryFilter<BookingDoc> = { status: { $nin: HIDDEN as BookingDoc["status"][] } };
  if (typeof query.venue === "string" && query.venue) filter.venueSlug = query.venue;
  if (query.from !== undefined || query.to !== undefined) {
    const range: Record<string, string> = {};
    if (query.from !== undefined) {
      if (!isIsoDate(query.from)) throw badDate();
      range.$gte = query.from;
    }
    if (query.to !== undefined) {
      if (!isIsoDate(query.to)) throw badDate();
      range.$lte = query.to;
    }
    filter.date = range;
  }

  const search = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  if (isRef("booking", canonicalRef(search))) filter.ref = canonicalRef(search);
  else if (search) filter.memberId = { $in: await membersMatching(search) };

  const now = new Date();
  const views = await toStaffBookingViews(
    await Booking.find(filter).sort({ date: -1, startMin: -1 }).limit(ADMIN_LIMIT).lean<BookingDoc[]>(),
    now,
  );
  const status = typeof query.status === "string" ? query.status : "";
  return status ? views.filter((view) => view.status === status) : views;
};
