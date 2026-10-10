import { Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import { Admin, PartnerStaff, Venue, type PartnerStaffDoc, type VenueDoc } from "../models";
import type { AccountStatus } from "../types/auth";
import type { InvitePartnerInput, UpdatePartnerInput } from "../validators/catalogue";
import { lastActiveAt, revokeAccountSessions } from "./session.service";
import { hashPassword } from "./staffAuth.service";
import { detailsUpdate, emailTaken, isDuplicateKey } from "./staffDetails";

export type PartnerAccountView = {
  id: string;
  name: string;
  email: string;
  venueSlug: string;
  venueName: string | null;
  status: AccountStatus;
  lastActiveAt: string | null;
};

const venueUnknown = () => new AppError("That venue doesn't exist.", 422, "VENUE_UNKNOWN");
const notFound = () => new AppError("That partner account no longer exists.", 404, "PARTNER_NOT_FOUND");

const venueNames = async () => {
  const venues = await Venue.find({}, { slug: 1, name: 1 })
    .sort({ name: 1 })
    .lean<Pick<VenueDoc, "slug" | "name">[]>();
  return {
    list: venues.map(({ slug, name }) => ({ slug, name })),
    bySlug: new Map(venues.map((venue) => [venue.slug, venue.name])),
  };
};

const toView = (
  staff: PartnerStaffDoc,
  names: Map<string, string>,
  seen: Date | undefined,
): PartnerAccountView => ({
  id: staff._id.toString(),
  name: staff.name,
  email: staff.email,
  venueSlug: staff.venueSlug,
  venueName: names.get(staff.venueSlug) ?? null,
  status: staff.status,
  lastActiveAt: seen?.toISOString() ?? null,
});

const viewOne = async (staff: PartnerStaffDoc) => {
  const [{ bySlug }, activity] = await Promise.all([venueNames(), lastActiveAt("partner", [staff._id])]);
  return toView(staff, bySlug, activity.get(staff._id.toString()));
};

export const listPartnerAccounts = async (venueSlug?: string) => {
  const staff = await PartnerStaff.find(venueSlug ? { venueSlug } : {})
    .sort({ name: 1 })
    .lean<PartnerStaffDoc[]>();
  const [{ list, bySlug }, activity] = await Promise.all([
    venueNames(),
    lastActiveAt(
      "partner",
      staff.map((item) => item._id),
    ),
  ]);
  return {
    accounts: staff.map((item) => toView(item, bySlug, activity.get(item._id.toString()))),
    venues: list,
  };
};

export const invitePartner = async (input: InvitePartnerInput, invitedById: string) => {
  if (!(await Venue.exists({ slug: input.venueSlug }))) throw venueUnknown();
  const [admin, partner] = await Promise.all([
    Admin.exists({ email: input.email }),
    PartnerStaff.exists({ email: input.email }),
  ]);
  if (admin || partner) throw new AppError("That email already has a Growth Hub account.", 409, "EMAIL_TAKEN");

  const { temporaryPassword, ...fields } = input;
  const created = await PartnerStaff.create({
    ...fields,
    passwordHash: await hashPassword(temporaryPassword),
    mustChangePassword: true,
    status: "active",
    invitedBy: new Types.ObjectId(invitedById),
  });
  return viewOne(created.toObject());
};

export const updatePartner = async (id: string, change: UpdatePartnerInput) => {
  const staff = Types.ObjectId.isValid(id) ? await PartnerStaff.findById(id).lean<PartnerStaffDoc>() : null;
  if (!staff) throw notFound();
  if (change.venueSlug && !(await Venue.exists({ slug: change.venueSlug }))) throw venueUnknown();

  const details = await detailsUpdate(staff, change);
  let updated: PartnerStaffDoc | null;
  try {
    updated = await PartnerStaff.findByIdAndUpdate(
      staff._id,
      {
        $set: {
          ...details.set,
          ...(change.status && { status: change.status }),
          ...(change.venueSlug && { venueSlug: change.venueSlug }),
        },
      },
      { returnDocument: "after" },
    ).lean<PartnerStaffDoc>();
  } catch (error) {
    if (isDuplicateKey(error)) throw emailTaken();
    throw error;
  }
  if (!updated) throw notFound();

  if (change.status === "disabled" && staff.status !== "disabled") {
    await revokeAccountSessions("partner", staff._id, "disabled");
  } else if (details.signOut) {
    await revokeAccountSessions("partner", staff._id, "details-changed");
  } else if (change.venueSlug && change.venueSlug !== staff.venueSlug) {
    await revokeAccountSessions("partner", staff._id, "venue-changed");
  }
  return viewOne(updated);
};
