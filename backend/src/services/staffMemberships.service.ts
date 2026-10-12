import { Membership, type MembershipDoc } from "../models";
import { toMembershipView } from "./membershipView";
import { findMembers } from "./accountSnapshot.service";
import { phoneOf } from "./staffBookings.service";

const ADMIN_LIMIT = 200;
const PAID_STATUSES = ["active", "past-due", "ended", "lapsed", "cancelled"];

export type StaffMembershipView = {
  ref: string;
  status: string;
  venue: { slug: string; name: string };
  member: { name: string; phone: string };
  spaceType: string;
  length: string;
  seats: string[];
  people: number;
  /** Paise per cycle. */
  cyclePrice: number;
  startDate: string;
  paidThrough: string | null;
  renewsOn: string | null;
  cancelAtCycleEnd: boolean;
};

export const toStaffMembershipViews = async (memberships: MembershipDoc[]): Promise<StaffMembershipView[]> => {
  const members = await findMembers(memberships.map((item) => item.memberId));
  const byId = new Map(members.map((member) => [member._id.toString(), member]));
  const now = new Date();
  return memberships.map((membership) => {
    const member = byId.get(membership.memberId.toString());
    const view = toMembershipView(membership, now);
    return {
      ref: membership.ref,
      status: view.status,
      venue: { slug: membership.venueSlug, name: membership.venue.name },
      member: { name: member?.name ?? "Member", phone: member ? phoneOf(member) : "" },
      spaceType: membership.spaceType,
      length: membership.length,
      seats: membership.seats.map((seat) => seat.label),
      people: membership.people,
      cyclePrice: membership.cyclePrice,
      startDate: membership.startDate,
      paidThrough: membership.paidThrough,
      renewsOn: view.renewsOn,
      cancelAtCycleEnd: membership.cancelAtCycleEnd,
    };
  });
};

/** Live plans at one venue; the slug always comes from the signed-in partner. */
export const listVenueMembers = async (venueSlug: string) =>
  toStaffMembershipViews(
    await Membership.find({ venueSlug, status: { $in: ["active", "past-due"] } })
      .sort({ startDate: 1 })
      .lean<MembershipDoc[]>(),
  );

export const listAdminMemberships = async (query: { venue?: unknown; status?: unknown }) => {
  const filter: Record<string, unknown> = { status: { $in: PAID_STATUSES } };
  if (typeof query.venue === "string" && query.venue) filter.venueSlug = query.venue;
  const views = await toStaffMembershipViews(
    await Membership.find(filter).sort({ createdAt: -1 }).limit(ADMIN_LIMIT).lean<MembershipDoc[]>(),
  );
  return typeof query.status === "string" && query.status ? views.filter((view) => view.status === query.status) : views;
};
