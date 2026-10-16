import { Types } from "mongoose";
import { env } from "../config/env";
import { CONTENT_TYPE_EXTENSIONS } from "../constants/assets";
import {
  GUEST_TOPICS,
  SUPPORT_LIMITS,
  SUPPORT_STATUSES,
  type SupportCategory,
  type SupportSource,
  type SupportStatus,
} from "../constants/support";
import { AppError } from "../middlewares/error.middleware";
import {
  Booking,
  Member,
  Membership,
  SupportRequest,
  type BookingDoc,
  type MemberDoc,
  type MembershipDoc,
  type SupportActor,
  type SupportContact,
  type SupportEvent,
  type SupportEventType,
  type SupportRelated,
  type SupportRequestDoc,
} from "../models";
import { dateLabel } from "../utils/indiaTime";
import { escapeRegex } from "../utils/regex";
import { canonicalRef, freshRef, isRef } from "../utils/refs";
import type { AdminUpdateInput, CreateSupportInput, GuestSupportInput } from "../validators/support";
import { readUrlFor } from "./assetUpload.service";
import { phoneOf } from "./staffBookings.service";
import { tellSupportUpdated } from "./supportNotices";

const HOUR_MS = 60 * 60 * 1000;
export const SUPPORT_STALE_MS = 24 * HOUR_MS;
const LIST_LIMIT = 200;
const MINE_LIMIT = 100;
const OPTION_LIMIT = 20;
const UNPAID = ["pending-payment", "expired"] as const;
const EXTENSIONS = [...new Set(Object.values(CONTENT_TYPE_EXTENSIONS))].join("|");

const notFound = () => new AppError("We couldn't find that request.", 404, "SUPPORT_REQUEST_NOT_FOUND");
const changed = () =>
  new AppError("This request changed while you were on it. Refresh and try again.", 409, "SUPPORT_REQUEST_CHANGED");
const tooLong = () =>
  new AppError("This conversation is too long to add to. Raise a new request instead.", 409, "SUPPORT_REQUEST_FULL");
const fieldError = (field: string, message: string) =>
  new AppError("Check the highlighted fields.", 400, "VALIDATION_FAILED", { fields: { [field]: message } });

type Who = "customer" | "growth-hub";

export type SupportAttachment = { url: string };

export type MemberSupportEvent = {
  type: SupportEventType;
  at: string;
  by: Who;
  message: string;
  from: SupportStatus | null;
  to: SupportStatus | null;
};

export type MemberSupportSummary = {
  ref: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  related: SupportRelated | null;
  createdAt: string;
  lastActivityAt: string;
  /** Who wrote last, so the list can flag a new reply. */
  lastFrom: Who;
  replies: number;
};

export type MemberSupportDetail = MemberSupportSummary & {
  message: string;
  attachments: SupportAttachment[];
  events: MemberSupportEvent[];
  canFollowUp: boolean;
};

export type AdminSupportSummary = {
  ref: string;
  source: SupportSource;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  contact: SupportContact;
  related: SupportRelated | null;
  attachmentCount: number;
  createdAt: string;
  lastActivityAt: string;
  awaitingReplySince: string | null;
};

export type AdminSupportDetail = AdminSupportSummary & {
  message: string;
  attachments: SupportAttachment[];
  events: (Omit<MemberSupportEvent, "by"> & { by: { type: SupportActor["type"]; name: string } })[];
  customer: { id: string; deleted: boolean } | null;
};

export type SupportCounts = Record<SupportStatus, number> & { waiting: number };

const event = (type: SupportEventType, by: SupportActor, at: Date, message = ""): SupportEvent => ({
  type,
  at,
  by,
  message,
  from: null,
  to: null,
});

const statusEvent = (by: SupportActor, at: Date, from: SupportStatus, to: SupportStatus): SupportEvent => ({
  ...event("status", by, at),
  from,
  to,
});

const searchTextOf = (ref: string, contact: SupportContact) =>
  [ref, contact.name, contact.email ?? "", (contact.phone ?? "").replace(/\D/g, "")].join(" ").toLowerCase();

const attachmentsOf = (keys: string[]): SupportAttachment[] => (env().aws ? keys.map((key) => ({ url: readUrlFor(key) })) : []);

const lastOf = <T>(items: T[]): T | undefined => items[items.length - 1];

const lastActivityOf = (request: SupportRequestDoc) => (lastOf(request.events)?.at ?? request.createdAt).toISOString();

const isMessage = (item: SupportEvent) => item.type !== "status";

const whoOf = (actor: SupportActor): Who => (actor.type === "admin" ? "growth-hub" : "customer");

const memberSummary = (request: SupportRequestDoc): MemberSupportSummary => {
  const lastMessage = lastOf(request.events.filter(isMessage));
  return {
    ref: request.ref,
    category: request.category,
    subject: request.subject,
    status: request.status,
    related: request.related,
    createdAt: request.createdAt.toISOString(),
    lastActivityAt: lastActivityOf(request),
    lastFrom: lastMessage ? whoOf(lastMessage.by) : "customer",
    replies: request.events.filter((item) => item.type === "reply").length,
  };
};

const memberDetail = (request: SupportRequestDoc): MemberSupportDetail => ({
  ...memberSummary(request),
  message: request.message,
  attachments: attachmentsOf(request.attachments),
  events: request.events.map((item) => ({
    type: item.type,
    at: item.at.toISOString(),
    by: whoOf(item.by),
    message: item.message,
    from: item.from,
    to: item.to,
  })),
  canFollowUp: request.status !== "closed",
});

const adminSummary = (request: SupportRequestDoc): AdminSupportSummary => ({
  ref: request.ref,
  source: request.source,
  category: request.category,
  subject: request.subject,
  status: request.status,
  contact: { name: request.contact.name, email: request.contact.email, phone: request.contact.phone },
  related: request.related,
  attachmentCount: request.attachments.length,
  createdAt: request.createdAt.toISOString(),
  lastActivityAt: lastActivityOf(request),
  awaitingReplySince: request.awaitingReplySince?.toISOString() ?? null,
});

const adminDetail = async (request: SupportRequestDoc): Promise<AdminSupportDetail> => ({
  ...adminSummary(request),
  message: request.message,
  attachments: attachmentsOf(request.attachments),
  events: request.events.map((item) => ({
    type: item.type,
    at: item.at.toISOString(),
    by: { type: item.by.type, name: item.by.name },
    message: item.message,
    from: item.from,
    to: item.to,
  })),
  customer: request.memberId
    ? { id: request.memberId.toString(), deleted: !(await Member.exists({ _id: request.memberId })) }
    : null,
});

const insert = async (
  fields: Pick<SupportRequestDoc, "source" | "memberId" | "contact" | "category" | "subject" | "message" | "attachments" | "related">,
  by: SupportActor,
) => {
  const now = new Date();
  const ref = await freshRef("support", (candidate) => SupportRequest.exists({ ref: candidate }));
  const created = await SupportRequest.create({
    ...fields,
    ref,
    status: "open",
    events: [event("created", by, now)],
    awaitingReplySince: now,
    searchText: searchTextOf(ref, fields.contact),
  });
  return created.toObject() as SupportRequestDoc;
};

// Counted from saved requests, so a form that fails validation never uses up the allowance.
const checkHourlyAllowance = async (memberId: Types.ObjectId, now: Date) => {
  const allowed = SUPPORT_LIMITS.newPerHour;
  const recent = await SupportRequest.find({ memberId, createdAt: { $gt: new Date(now.getTime() - HOUR_MS) } }, { createdAt: 1 })
    .sort({ createdAt: 1 })
    .limit(allowed)
    .lean<Pick<SupportRequestDoc, "createdAt">[]>();
  if (recent.length < allowed) return;
  const retryAfterSeconds = Math.max(1, Math.ceil((recent[0].createdAt.getTime() + HOUR_MS - now.getTime()) / 1000));
  throw new AppError(
    `You can raise ${allowed} requests an hour. Add a message to an open one, or try again later.`,
    429,
    "RATE_LIMITED",
    { retryAfterSeconds },
  );
};

const relatedOf = async (memberId: Types.ObjectId, input: string): Promise<SupportRelated | null> => {
  if (!input) return null;
  const ref = canonicalRef(input);
  const filter = { ref, memberId, status: { $nin: UNPAID } };
  if (isRef("booking", ref)) {
    const booking = await Booking.findOne(filter, { ref: 1, venue: 1 }).lean<Pick<BookingDoc, "ref" | "venue">>();
    if (booking) return { kind: "booking", ref: booking.ref, venueName: booking.venue.name };
  } else if (isRef("membership", ref)) {
    const membership = await Membership.findOne(filter, { ref: 1, venue: 1 }).lean<Pick<MembershipDoc, "ref" | "venue">>();
    if (membership) return { kind: "membership", ref: membership.ref, venueName: membership.venue.name };
  }
  throw fieldError("relatedRef", "Pick one of your bookings or memberships.");
};

// Keys come from this member's own upload tickets, never another account's folder.
const checkAttachments = (memberId: string, keys: string[]) => {
  const unique = [...new Set(keys)];
  const pattern = new RegExp(`^support/${memberId}/[0-9a-f-]{36}\\.(${EXTENSIONS})$`);
  if (unique.some((key) => !pattern.test(key))) throw fieldError("attachments", "Upload your screenshots again.");
  return unique;
};

const memberOf = async (memberId: string) => {
  const member = Types.ObjectId.isValid(memberId) ? await Member.findById(memberId).lean<MemberDoc>() : null;
  if (!member) throw new AppError("Please sign in again.", 401, "SESSION_REVOKED");
  return member;
};

export const createMemberRequest = async (memberId: string, input: CreateSupportInput, now = new Date()) => {
  const member = await memberOf(memberId);
  await checkHourlyAllowance(member._id, now);
  const related = await relatedOf(member._id, input.relatedRef);
  const attachments = checkAttachments(memberId, input.attachments);
  const contact: SupportContact = {
    name: member.name?.trim() || "Customer",
    email: member.email ?? member.billingEmail ?? null,
    phone: phoneOf(member),
  };
  const created = await insert(
    { source: "account", memberId: member._id, contact, category: input.category, subject: input.subject, message: input.message, attachments, related },
    { type: "member", id: memberId, name: contact.name },
  );
  return memberDetail(created);
};

export const createGuestRequest = async (input: GuestSupportInput) => {
  const topic = GUEST_TOPICS[input.topic];
  const contact: SupportContact = {
    name: input.name,
    email: input.email,
    phone: input.phone ? `+91 ${input.phone.slice(0, 5)} ${input.phone.slice(5)}` : null,
  };
  const created = await insert(
    { source: "contact-form", memberId: null, contact, category: topic.category, subject: topic.subject, message: input.message, attachments: [], related: null },
    { type: "guest", id: null, name: contact.name },
  );
  return { ref: created.ref };
};

const findMine = async (memberId: string, ref: string) => {
  const wanted = canonicalRef(ref);
  if (!isRef("support", wanted) || !Types.ObjectId.isValid(memberId)) throw notFound();
  const request = await SupportRequest.findOne({ ref: wanted, memberId }).lean<SupportRequestDoc>();
  if (!request) throw notFound();
  return request;
};

export const listMine = async (memberId: string) => {
  if (!Types.ObjectId.isValid(memberId)) return [];
  const requests = await SupportRequest.find({ memberId }).sort({ createdAt: -1, _id: -1 }).limit(MINE_LIMIT).lean<SupportRequestDoc[]>();
  return requests.map(memberSummary);
};

export const getMine = async (memberId: string, ref: string) => memberDetail(await findMine(memberId, ref));

/** A follow-up on a resolved request reopens it; a closed one takes no more messages. */
export const followUp = async (memberId: string, ref: string, message: string, now = new Date()) => {
  const request = await findMine(memberId, ref);
  if (request.status === "closed") {
    throw new AppError("This request is closed. Raise a new one if you still need help.", 409, "SUPPORT_REQUEST_CLOSED");
  }
  const reopen = request.status === "resolved";
  const events = [event("follow-up", { type: "member", id: memberId, name: request.contact.name }, now, message)];
  if (reopen) events.push(statusEvent({ type: "member", id: memberId, name: request.contact.name }, now, "resolved", "open"));
  if (request.events.length + events.length > SUPPORT_LIMITS.events) throw tooLong();

  const set: Record<string, unknown> = {};
  if (reopen) set.status = "open";
  if (!request.awaitingReplySince) set.awaitingReplySince = now;
  const updated = await SupportRequest.findOneAndUpdate(
    { _id: request._id, status: request.status },
    { ...(Object.keys(set).length && { $set: set }), $push: { events: { $each: events } } },
    { returnDocument: "after" },
  ).lean<SupportRequestDoc>();
  if (!updated) throw changed();
  return memberDetail(updated);
};

export const relatedOptions = async (memberId: string) => {
  if (!Types.ObjectId.isValid(memberId)) return [];
  const id = new Types.ObjectId(memberId);
  const [memberships, bookings] = await Promise.all([
    Membership.find({ memberId: id, status: { $nin: UNPAID } }, { ref: 1, venue: 1, startDate: 1 })
      .sort({ startDate: -1 })
      .limit(OPTION_LIMIT)
      .lean<Pick<MembershipDoc, "ref" | "venue" | "startDate">[]>(),
    Booking.find({ memberId: id, status: { $nin: UNPAID } }, { ref: 1, venue: 1, date: 1 })
      .sort({ date: -1 })
      .limit(OPTION_LIMIT)
      .lean<Pick<BookingDoc, "ref" | "venue" | "date">[]>(),
  ]);
  return [
    ...memberships.map((item) => ({
      kind: "membership" as const,
      ref: item.ref,
      label: `${item.venue.name}, membership from ${dateLabel(item.startDate)}`,
    })),
    ...bookings.map((item) => ({ kind: "booking" as const, ref: item.ref, label: `${item.venue.name}, ${dateLabel(item.date)}` })),
  ];
};

export type AdminSupportFilters = { status?: SupportStatus; category?: SupportCategory; q?: string; waiting?: boolean };

const WAITING_STATUSES: SupportStatus[] = ["open", "in-progress"];

// Unresolved requests whose customer has waited over a day for a Growth Hub reply.
const waitingFilter = (now: Date) => ({
  status: { $in: WAITING_STATUSES },
  awaitingReplySince: { $lt: new Date(now.getTime() - SUPPORT_STALE_MS) },
});

export const countWaiting = (now = new Date()) => SupportRequest.countDocuments(waitingFilter(now));

const searchFilter = (query: string) => {
  const text = query.trim().toLowerCase();
  const digits = text.replace(/\D/g, "");
  // Phone numbers are stored as bare digits, so spaces and a +91 typed in still match.
  const isPhone = /^[\d\s+()-]+$/.test(text) && digits.length >= 4;
  return { searchText: { $regex: escapeRegex(isPhone ? digits : text) } };
};

export const listAdmin = async (filters: AdminSupportFilters, now = new Date()) => {
  const match: Record<string, unknown> = {};
  if (filters.status) match.status = filters.status;
  if (filters.category) match.category = filters.category;
  if (filters.q?.trim()) Object.assign(match, searchFilter(filters.q));
  if (filters.waiting) Object.assign(match, waitingFilter(now));

  const [requests, grouped, waiting] = await Promise.all([
    SupportRequest.find(match)
      .slice("events", -1)
      .sort({ createdAt: -1, _id: -1 })
      .limit(LIST_LIMIT)
      .lean<SupportRequestDoc[]>(),
    SupportRequest.aggregate<{ _id: SupportStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    countWaiting(now),
  ]);
  const counts = Object.fromEntries(
    SUPPORT_STATUSES.map((status) => [status, grouped.find((row) => row._id === status)?.count ?? 0]),
  ) as Record<SupportStatus, number>;
  return { requests: requests.map(adminSummary), counts: { ...counts, waiting } satisfies SupportCounts };
};

const findByRef = async (ref: string) => {
  const wanted = canonicalRef(ref);
  const request = isRef("support", wanted) ? await SupportRequest.findOne({ ref: wanted }).lean<SupportRequestDoc>() : null;
  if (!request) throw notFound();
  return request;
};

export const getAdmin = async (ref: string) => adminDetail(await findByRef(ref));

/** A status change, a reply, or both; the customer is emailed about either. */
export const updateAdmin = async (ref: string, admin: { id: string; name: string }, input: AdminUpdateInput, now = new Date()) => {
  const request = await findByRef(ref);
  const next = input.status ?? request.status;
  const statusChanged = next !== request.status;
  if (!input.reply && !statusChanged) {
    throw input.status
      ? fieldError("status", "Pick a different status, or write a reply.")
      : fieldError("reply", "Write a reply, or change the status.");
  }

  const by: SupportActor = { type: "admin", id: admin.id, name: admin.name || "Growth Hub" };
  const events: SupportEvent[] = [];
  if (input.reply) events.push(event("reply", by, now, input.reply));
  if (statusChanged) events.push(statusEvent(by, now, request.status, next));
  if (request.events.length + events.length > SUPPORT_LIMITS.events) throw tooLong();

  const set: Record<string, unknown> = { status: next };
  if (input.reply) set.awaitingReplySince = null;
  const updated = await SupportRequest.findOneAndUpdate(
    { _id: request._id, status: request.status },
    { $set: set, $push: { events: { $each: events } } },
    { returnDocument: "after" },
  ).lean<SupportRequestDoc>();
  if (!updated) throw changed();

  await tellSupportUpdated(updated, input.reply);
  return adminDetail(updated);
};
