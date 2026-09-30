import { Types } from "mongoose";
import type { AddonUnit } from "../constants/catalogue";
import { AppError } from "../middlewares/error.middleware";
import { AddonType, Venue, type Actor, type AddonTypeDoc, type VenueDoc } from "../models";
import type { CreateAddonTypeInput, PatchAddonTypeInput, VenueAddonsInput } from "../validators/catalogue";
import { getPublicVenue, type PublicVenueDetail } from "./venueCatalogue.service";

export type AddonTypeView = {
  id: string;
  key: string;
  name: string;
  description: string;
  unit: AddonUnit;
  active: boolean;
  sortOrder: number;
};

export type AddonChoice = {
  addonTypeId: string;
  key: string;
  name: string;
  description: string;
  unit: AddonUnit;
  price: number | null;
  enabled: boolean;
};

export type PartnerVenue = PublicVenueDetail & { addonChoices: AddonChoice[] };

const toView = (type: AddonTypeDoc): AddonTypeView => ({
  id: type._id.toString(),
  key: type.key,
  name: type.name,
  description: type.description,
  unit: type.unit,
  active: type.active,
  sortOrder: type.sortOrder,
});

const byOrder = { sortOrder: 1, name: 1 } as const;

export const listAddonTypes = async () =>
  (await AddonType.find().sort(byOrder).lean<AddonTypeDoc[]>()).map(toView);

export const createAddonType = async (input: CreateAddonTypeInput) => {
  if (await AddonType.exists({ key: input.key })) {
    throw new AppError("That key is already used.", 409, "ADDON_KEY_TAKEN");
  }
  return toView((await AddonType.create(input)).toObject());
};

export const updateAddonType = async (id: string, change: PatchAddonTypeInput) => {
  const updated = Types.ObjectId.isValid(id)
    ? await AddonType.findByIdAndUpdate(id, { $set: change }, { returnDocument: "after" }).lean<AddonTypeDoc>()
    : null;
  if (!updated) throw new AppError("That add-on type no longer exists.", 404, "ADDON_TYPE_NOT_FOUND");
  return toView(updated);
};

export const getPartnerVenue = async (venueSlug: string): Promise<PartnerVenue> => {
  const detail = await getPublicVenue(venueSlug);
  const venue = await Venue.findOne({ slug: venueSlug }, { addons: 1 }).lean<Pick<VenueDoc, "addons">>();
  const prices = new Map((venue?.addons ?? []).map((addon) => [addon.addonTypeId.toString(), addon]));
  const types = await AddonType.find({ active: true }).sort(byOrder).lean<AddonTypeDoc[]>();

  return {
    ...detail,
    addonChoices: types.map((type) => {
      const saved = prices.get(type._id.toString());
      return {
        addonTypeId: type._id.toString(),
        key: type.key,
        name: type.name,
        description: type.description,
        unit: type.unit,
        price: saved?.price ?? null,
        enabled: saved?.enabled ?? false,
      };
    }),
  };
};

export const setVenueAddons = async (venueSlug: string, input: VenueAddonsInput, actor: Actor) => {
  const ids = input.addons.map((addon) => addon.addonTypeId);
  const active = await AddonType.find({ _id: { $in: ids }, active: true }, { _id: 1 }).lean<
    { _id: Types.ObjectId }[]
  >();
  const known = new Set(active.map((type) => type._id.toString()));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new AppError("Some add-ons are not offered by Growth Hub.", 422, "ADDON_UNKNOWN", {
      addonTypeIds: unknown,
    });
  }

  const venue = await Venue.findOne({ slug: venueSlug }, { addons: 1 }).lean<Pick<VenueDoc, "_id" | "addons">>();
  if (!venue) throw new AppError("That venue doesn't exist.", 404, "VENUE_NOT_FOUND");

  // A retired type's price stays on the venue, so restoring the type restores the offer.
  const activeIds = new Set(
    (await AddonType.find({ active: true }, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>()).map((type) =>
      type._id.toString(),
    ),
  );
  const retired = venue.addons.filter((addon) => !activeIds.has(addon.addonTypeId.toString()));

  await Venue.updateOne(
    { _id: venue._id },
    {
      $set: {
        addons: [
          ...input.addons.map((addon) => ({ ...addon, addonTypeId: new Types.ObjectId(addon.addonTypeId) })),
          ...retired,
        ],
        updatedBy: actor,
      },
      $inc: { __v: 1 },
    },
  );
  return getPartnerVenue(venueSlug);
};
