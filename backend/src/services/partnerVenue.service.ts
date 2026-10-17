import { env } from "../config/env";
import { AppError } from "../middlewares/error.middleware";
import { Amenity, Venue, type Actor, type VenueDoc } from "../models";
import type { PartnerVenueInput } from "../validators/catalogue";
import { getPartnerVenue } from "./addon.service";
import { ensureDefaultAmenities } from "./amenity.service";
import { readUrlFor } from "./assetUpload.service";
import { patchVenue } from "./venueCatalogue.service";

const fieldError = (field: string, message: string, code = "VALIDATION_FAILED") =>
  new AppError(code === "VALIDATION_FAILED" ? "Check the highlighted fields." : message, 400, code, {
    fields: { [field]: message },
  });

/** New photos must come from this venue's own upload folder; saved ones may stay. */
const refuseForeignPhotos = (slug: string, venue: Pick<VenueDoc, "image" | "gallery">, input: PartnerVenueInput) => {
  const kept = new Set([venue.image, ...(venue.gallery ?? [])].filter(Boolean));
  const folder = env().aws ? readUrlFor(`venues/${slug}/`) : null;
  const allowed = (url: string) => url === "" || kept.has(url) || Boolean(folder && url.startsWith(folder));
  const message = "Upload photos from this page.";
  if (input.image !== undefined && !allowed(input.image)) throw fieldError("image", message);
  if (input.gallery?.some((url) => !allowed(url))) throw fieldError("gallery", message);
};

/** Hidden amenities stay on venues that have them, but staff can't add them. */
const refuseHiddenAmenities = async (current: string[], next: string[] | undefined) => {
  const added = (next ?? []).filter((key) => !current.includes(key));
  if (!added.length) return;
  await ensureDefaultAmenities();
  const visible = await Amenity.find({ key: { $in: added }, visible: true }, { key: 1 }).lean<{ key: string }[]>();
  if (visible.length < new Set(added).size) {
    throw fieldError("amenities", "Pick amenities from the list.", "AMENITY_UNKNOWN");
  }
};

export const patchPartnerVenue = async (slug: string, input: PartnerVenueInput, actor: Actor) => {
  const venue = await Venue.findOne({ slug }, { image: 1, gallery: 1, amenities: 1 }).lean<
    Pick<VenueDoc, "image" | "gallery" | "amenities">
  >();
  if (!venue) throw new AppError("That venue doesn't exist.", 404, "VENUE_NOT_FOUND");
  refuseForeignPhotos(slug, venue, input);
  await refuseHiddenAmenities(venue.amenities ?? [], input.amenities);
  await patchVenue(slug, input, actor);
  return getPartnerVenue(slug);
};
