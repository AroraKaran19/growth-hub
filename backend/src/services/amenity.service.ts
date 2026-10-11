import { Types } from "mongoose";
import { DEFAULT_AMENITIES } from "../constants/defaultAmenities";
import { AppError } from "../middlewares/error.middleware";
import { Amenity, CatalogueLabel, Counter, Venue, type AmenityDoc } from "../models";
import type { AmenityInput } from "../validators/catalogue";

const SEEDED = "amenities-seeded";

/** Copies the built-in amenities once, keeping names admins had already changed; a marker stops a deleted one returning. */
export const ensureDefaultAmenities = async () => {
  if (await Counter.exists({ _id: SEEDED })) return;
  const renamed = await CatalogueLabel.find({ kind: "amenity" }).lean<{ key: string; label?: string }[]>();
  const names = new Map(renamed.map((row) => [row.key, row.label]));
  await Amenity.bulkWrite(
    DEFAULT_AMENITIES.map((item, index) => ({
      updateOne: {
        filter: { key: item.key },
        update: { $setOnInsert: { ...item, name: names.get(item.key) || item.name, visible: true, sortOrder: index } },
        upsert: true,
      },
    })),
  );
  await CatalogueLabel.deleteMany({ kind: "amenity" });
  await Counter.updateOne({ _id: SEEDED }, { $setOnInsert: { seq: 1 } }, { upsert: true });
};

const toView = (item: AmenityDoc) => ({
  id: item._id.toString(),
  key: item.key,
  name: item.name,
  icon: item.icon,
  description: item.description,
  visible: item.visible,
});

export const listAmenities = async (onlyVisible: boolean) => {
  await ensureDefaultAmenities();
  const rows = await Amenity.find(onlyVisible ? { visible: true } : {}).sort({ sortOrder: 1, name: 1 }).lean<AmenityDoc[]>();
  return rows.map(toView);
};

const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "amenity";

export const createAmenity = async (input: AmenityInput) => {
  await ensureDefaultAmenities();
  const base = slugOf(input.name);
  let key = base;
  for (let suffix = 2; await Amenity.exists({ key }); suffix += 1) key = `${base}-${suffix}`;
  const last = await Amenity.findOne().sort({ sortOrder: -1 }).lean<AmenityDoc>();
  const created = await Amenity.create({ ...input, key, sortOrder: (last?.sortOrder ?? -1) + 1 });
  return toView(created.toObject());
};

const notFound = () => new AppError("That amenity no longer exists.", 404, "AMENITY_NOT_FOUND");

export const updateAmenity = async (id: string, input: AmenityInput) => {
  const updated = Types.ObjectId.isValid(id)
    ? await Amenity.findByIdAndUpdate(id, { $set: input }, { returnDocument: "after" }).lean<AmenityDoc>()
    : null;
  if (!updated) throw notFound();
  return toView(updated);
};

export const deleteAmenity = async (id: string) => {
  const amenity = Types.ObjectId.isValid(id) ? await Amenity.findById(id).lean<AmenityDoc>() : null;
  if (!amenity) throw notFound();
  const used = await Venue.countDocuments({ amenities: amenity.key });
  if (used) {
    throw new AppError(
      `${used} venue${used === 1 ? " offers" : "s offer"} ${amenity.name}. Hide it instead, or remove it from those venues first.`,
      409,
      "AMENITY_IN_USE",
    );
  }
  await Amenity.deleteOne({ _id: amenity._id });
};

export const reorderAmenities = async (ids: string[]) => {
  await Amenity.bulkWrite(ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } } })));
  return listAmenities(false);
};

/** Venues may list only amenities that exist, hidden ones included. */
export const assertAmenitiesExist = async (keys: string[]) => {
  if (!keys.length) return;
  await ensureDefaultAmenities();
  const found = await Amenity.find({ key: { $in: keys } }, { key: 1 }).lean<{ key: string }[]>();
  const missing = keys.filter((key) => !found.some((row) => row.key === key));
  if (missing.length) {
    throw new AppError("Pick amenities from the list.", 400, "AMENITY_UNKNOWN", { fields: { amenities: "Pick amenities from the list." } });
  }
};
