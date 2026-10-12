import { Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import { Membership, MembershipPlan, Venue, type MembershipPlanDoc, type VenueDoc } from "../models";
import { toMinutes } from "../utils/indiaTime";
import type { PlanInput, PlanOrderInput, PlanUpdateInput } from "../validators/membershipPlan";

type PlanVenue = Pick<VenueDoc, "_id" | "slug" | "name" | "openDays" | "opensAt" | "closesAt">;

const VENUE_FIELDS = { slug: 1, name: 1, openDays: 1, opensAt: 1, closesAt: 1 };

const notFound = () => new AppError("That plan no longer exists.", 404, "PLAN_NOT_FOUND");

const fieldError = (message: string, code: string, field: string, detail: string) =>
  new AppError(message, 422, code, { fields: { [field]: detail } });

export const toPlanView = (plan: MembershipPlanDoc, inUse: boolean) => ({
  id: plan._id.toString(),
  venueSlug: plan.venueSlug,
  name: plan.name,
  description: plan.description,
  includes: plan.includes,
  space: plan.space,
  roomMode: plan.roomMode,
  slotHours: plan.slotHours,
  days: plan.days,
  prices: plan.prices,
  maxSeats: plan.maxSeats,
  visible: plan.visible,
  sortOrder: plan.sortOrder,
  inUse,
});

const loadVenue = async (slug: string) => {
  const venue = await Venue.findOne({ slug }, VENUE_FIELDS).lean<PlanVenue>();
  if (!venue) throw new AppError("That venue doesn't exist.", 422, "VENUE_UNKNOWN");
  return venue;
};

/** The plan must fit the venue as it is today. */
const checkAgainstVenue = (venue: PlanVenue, plan: PlanUpdateInput) => {
  const closed = plan.days.filter((day) => !venue.openDays.includes(day));
  if (closed.length) {
    throw fieldError("The venue is closed on some of those days.", "PLAN_DAYS_CLOSED", "days", "Pick only days the venue is open.");
  }
  if (plan.slotHours) {
    const opens = toMinutes(venue.opensAt);
    const closes = toMinutes(venue.closesAt);
    if (opens === null || closes === null || plan.slotHours * 60 > closes - opens) {
      throw fieldError("The slot is longer than the venue's opening hours.", "PLAN_SLOT_TOO_LONG", "slotHours", "Longer than the venue is open.");
    }
  }
};

const usedIds = async (ids: Types.ObjectId[]) =>
  new Set((await Membership.distinct("planId", { planId: { $in: ids } })).map((id) => String(id)));

export const listPlans = async (venueSlug: string | undefined) => {
  const venues = await Venue.find({}, { _id: 0, slug: 1, name: 1 }).sort({ name: 1 }).lean<{ slug: string; name: string }[]>();
  // With no venue chosen yet, open the first one.
  const slug = venueSlug ?? venues[0]?.slug;
  const venue = slug ? await Venue.findOne({ slug }, VENUE_FIELDS).lean<PlanVenue>() : null;
  if (!venue) return { venues, venue: null, plans: [] };

  const plans = await MembershipPlan.find({ venueSlug: venue.slug }).sort({ sortOrder: 1, createdAt: 1 }).lean<MembershipPlanDoc[]>();
  const used = await usedIds(plans.map((plan) => plan._id));
  const { name, openDays, opensAt, closesAt } = venue;
  return {
    venues,
    venue: { slug: venue.slug, name, openDays, opensAt, closesAt },
    plans: plans.map((plan) => toPlanView(plan, used.has(plan._id.toString()))),
  };
};

export const createPlan = async (input: PlanInput, adminId: string) => {
  const { venueSlug, ...plan } = input;
  const venue = await loadVenue(venueSlug);
  checkAgainstVenue(venue, plan);
  const last = await MembershipPlan.findOne({ venueSlug }, { sortOrder: 1 }).sort({ sortOrder: -1 }).lean<{ sortOrder: number }>();
  const created = await MembershipPlan.create({
    ...plan,
    venueId: venue._id,
    venueSlug,
    sortOrder: last ? last.sortOrder + 1 : 0,
    createdBy: new Types.ObjectId(adminId),
  });
  return toPlanView(created.toObject(), false);
};

const findPlan = async (id: string) => {
  const plan = Types.ObjectId.isValid(id) ? await MembershipPlan.findById(id).lean<MembershipPlanDoc>() : null;
  if (!plan) throw notFound();
  return plan;
};

export const updatePlan = async (id: string, change: PlanUpdateInput) => {
  const plan = await findPlan(id);
  checkAgainstVenue(await loadVenue(plan.venueSlug), change);
  const updated = await MembershipPlan.findByIdAndUpdate(plan._id, { $set: change }, { returnDocument: "after" }).lean<MembershipPlanDoc>();
  if (!updated) throw notFound();
  return toPlanView(updated, (await usedIds([updated._id])).size > 0);
};

export const deletePlan = async (id: string) => {
  const plan = await findPlan(id);
  if (await Membership.exists({ planId: plan._id })) {
    throw new AppError("Members have bought this plan, so it can only be hidden.", 409, "PLAN_IN_USE");
  }
  await MembershipPlan.deleteOne({ _id: plan._id });
};

export const reorderPlans = async ({ venueSlug, ids }: PlanOrderInput) => {
  const current = await MembershipPlan.find({ venueSlug }, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>();
  const known = new Set(current.map((plan) => plan._id.toString()));
  if (ids.length !== known.size || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
    throw new AppError("The plan list changed. Refresh and try again.", 409, "PLAN_ORDER_MISMATCH");
  }
  await MembershipPlan.bulkWrite(ids.map((id, index) => ({ updateOne: { filter: { _id: new Types.ObjectId(id) }, update: { $set: { sortOrder: index } } } })));
};
