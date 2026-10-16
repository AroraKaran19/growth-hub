import { Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import { MEMBERSHIP_LENGTHS, type PlanSpace } from "../constants/catalogue";
import { Membership, MembershipPlan, Venue, type DayHours, type MembershipPlanDoc, type PlanPrices, type VenueDoc } from "../models";
import { isOpenOnDay, openDaysOf, slotFits, sortHours } from "./venueHours";
import { MAX_PLAN_SEATS, type PlanInput, type PlanOrderInput, type PlanUpdateInput } from "../validators/membershipPlan";
import { notifyVenuesChanged } from "./revalidate.service";
import { refreshWorkspaceTypes } from "./workspaceTypes.service";

type PlanVenue = Pick<VenueDoc, "_id" | "slug" | "name" | "hours">;

const VENUE_FIELDS = { slug: 1, name: 1, hours: 1 };

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
  const closed = plan.days.filter((day) => !isOpenOnDay(venue, day));
  if (closed.length) {
    throw fieldError("The venue is closed on some of those days.", "PLAN_DAYS_CLOSED", "days", "Pick only days the venue is open.");
  }
  if (plan.slotHours && !slotFits(venue, plan.days, plan.slotHours)) {
    throw fieldError(
      "The slot is longer than the venue is open on some covered days.",
      "PLAN_SLOT_TOO_LONG",
      "slotHours",
      "Longer than the hours every covered day shares.",
    );
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
  return {
    venues,
    venue: { slug: venue.slug, name: venue.name, hours: sortHours(venue.hours ?? []) },
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
  await refreshWorkspaceTypes(venue._id);
  notifyVenuesChanged(created.venueSlug);
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
  await refreshWorkspaceTypes(updated.venueId);
  notifyVenuesChanged(updated.venueSlug);
  return toPlanView(updated, (await usedIds([updated._id])).size > 0);
};

export const deletePlan = async (id: string) => {
  const plan = await findPlan(id);
  if (await Membership.exists({ planId: plan._id })) {
    throw new AppError("Members have bought this plan, so it can only be hidden.", 409, "PLAN_IN_USE");
  }
  await MembershipPlan.deleteOne({ _id: plan._id });
  await refreshWorkspaceTypes(plan.venueId);
  notifyVenuesChanged(plan.venueSlug);
};

export const reorderPlans = async ({ venueSlug, ids }: PlanOrderInput) => {
  const current = await MembershipPlan.find({ venueSlug }, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>();
  const known = new Set(current.map((plan) => plan._id.toString()));
  if (ids.length !== known.size || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
    throw new AppError("The plan list changed. Refresh and try again.", 409, "PLAN_ORDER_MISMATCH");
  }
  await MembershipPlan.bulkWrite(ids.map((id, index) => ({ updateOne: { filter: { _id: new Types.ObjectId(id) }, update: { $set: { sortOrder: index } } } })));
  notifyVenuesChanged(venueSlug);
};

const byOrder = { sortOrder: 1 as const, createdAt: 1 as const };

const toSaleView = (plan: MembershipPlanDoc, days: number[]) => ({
  id: plan._id.toString(),
  name: plan.name,
  description: plan.description,
  includes: plan.includes,
  space: plan.space,
  roomMode: plan.roomMode,
  slotHours: plan.slotHours,
  days,
  prices: plan.prices,
  maxSeats: plan.maxSeats,
});

/** Plans on sale at a live venue, showing only the days it is still open. */
export const listVenuePlans = async (slug: string) => {
  const venue = await Venue.findOne({ slug, published: true }, { hours: 1 }).lean<Pick<VenueDoc, "_id" | "hours">>();
  if (!venue) throw new AppError("That venue doesn't exist.", 404, "VENUE_NOT_FOUND");
  const plans = await MembershipPlan.find({ venueSlug: slug, visible: true }).sort(byOrder).lean<MembershipPlanDoc[]>();
  return plans
    .map((plan) => toSaleView(plan, plan.days.filter((day) => isOpenOnDay(venue, day))))
    .filter((plan) => plan.days.length > 0);
};

/** Every plan at the partner's own venue, read-only; hidden ones are flagged. */
export const listPartnerPlans = async (venueSlug: string) => {
  const plans = venueSlug ? await MembershipPlan.find({ venueSlug }).sort(byOrder).lean<MembershipPlanDoc[]>() : [];
  return plans.map((plan) => ({ ...toSaleView(plan, plan.days), visible: plan.visible }));
};

const GRID_SPACES: [PlanSpace, string][] = [
  ["desk", "Dedicated desk"],
  ["private-cabin", "Private cabin"],
  ["office", "Office"],
];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

type GridVenue = {
  _id: Types.ObjectId;
  slug: string;
  openDays?: number[];
  hours?: DayHours[];
  membershipPrices?: Record<string, Record<string, unknown> | null> | null;
};

const gridDays = (venue: GridVenue) => {
  if (venue.openDays?.length) return [...venue.openDays].sort((a, b) => a - b);
  return venue.hours?.length ? openDaysOf(venue) : EVERY_DAY;
};

/** Turns each venue's old membership price grid into plans, once; safe to run at every start. */
export const migrateMembershipPrices = async () => {
  // The raw collection, since the venue model no longer knows the grid.
  const venues = await Venue.collection
    .find({ membershipPrices: { $exists: true } }, { projection: { slug: 1, openDays: 1, hours: 1, membershipPrices: 1 } })
    .toArray();
  let created = 0;
  for (const venue of venues as unknown as GridVenue[]) {
    const existing = await MembershipPlan.find({ venueId: venue._id }, { space: 1, sortOrder: 1 }).lean<MembershipPlanDoc[]>();
    let sortOrder = existing.reduce((next, plan) => Math.max(next, plan.sortOrder + 1), 0);
    for (const [space, name] of GRID_SPACES) {
      const row = venue.membershipPrices?.[space] ?? {};
      const prices = Object.fromEntries(
        MEMBERSHIP_LENGTHS.map((length) => {
          const price = row[length];
          return [length, typeof price === "number" && price > 0 ? price : null];
        }),
      ) as PlanPrices;
      if (Object.values(prices).every((price) => price === null) || existing.some((plan) => plan.space === space)) continue;
      await MembershipPlan.create({
        venueId: venue._id,
        venueSlug: venue.slug,
        name,
        space,
        days: gridDays(venue),
        prices,
        maxSeats: space === "desk" ? MAX_PLAN_SEATS : 1,
        visible: true,
        sortOrder: sortOrder++,
      });
      created += 1;
    }
    await Venue.collection.updateOne({ _id: venue._id }, { $unset: { membershipPrices: "" } });
  }
  return created;
};
