import type { AdminVenue } from "@/types/catalogue";

export type VenueDraft = {
  slug: string;
  name: string;
  locality: string;
  city: string;
  description: string;
  longDescription: string;
  rating: string;
  distanceKm: string;
  googleMapsUrl: string;
  openDays: number[];
  opensAt: string;
  closesAt: string;
  openDaysLabel: string;
  hoursNote: string;
  image: string;
  gallery: string[];
  amenities: string[];
  workspaceTypes: string[];
  rules: string[];
  startingPrice: string;
  halfDayPrice: string;
  dayPassPrice: string;
  priceUnit: "hr" | "day" | "month";
  hasOffer: boolean;
  offerLabel: string;
  offerDetails: string;
  published: boolean;
};

export type DraftErrors = Partial<Record<string, string>>;

export const EMPTY_DRAFT: VenueDraft = {
  slug: "",
  name: "",
  locality: "",
  city: "Bangalore",
  description: "",
  longDescription: "",
  rating: "0",
  distanceKm: "0",
  googleMapsUrl: "",
  openDays: [1, 2, 3, 4, 5, 6],
  opensAt: "09:00",
  closesAt: "18:00",
  openDaysLabel: "",
  hoursNote: "",
  image: "",
  gallery: [],
  amenities: [],
  workspaceTypes: [],
  rules: [],
  startingPrice: "",
  halfDayPrice: "",
  dayPassPrice: "",
  priceUnit: "hr",
  hasOffer: false,
  offerLabel: "",
  offerDetails: "",
  published: false,
};

export const toDraft = (venue: AdminVenue): VenueDraft => ({
  slug: venue.slug,
  name: venue.name,
  locality: venue.locality,
  city: venue.city,
  description: venue.description,
  longDescription: venue.longDescription,
  rating: String(venue.rating),
  distanceKm: String(venue.distanceKm),
  googleMapsUrl: venue.googleMapsUrl,
  openDays: venue.openDays,
  opensAt: venue.opensAt,
  closesAt: venue.closesAt,
  openDaysLabel: venue.openDaysLabel,
  hoursNote: venue.hoursNote,
  image: venue.image,
  gallery: venue.gallery,
  amenities: venue.amenities,
  workspaceTypes: venue.workspaceTypes,
  rules: venue.rules,
  startingPrice: priceText(venue.startingPrice),
  halfDayPrice: priceText(venue.halfDayPrice),
  dayPassPrice: priceText(venue.dayPassPrice),
  priceUnit: venue.priceUnit,
  hasOffer: Boolean(venue.offer),
  offerLabel: venue.offer?.label ?? "",
  offerDetails: venue.offer?.details ?? "",
  published: venue.published,
});

export const slugFromName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);

const SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;
const GOOGLE_HOSTS = ["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl"];

const priceText = (price: number | null) => (price === null ? "" : String(price));
/** Empty means the venue doesn't sell it. */
const priceOrNull = (value: string) => (value.trim() === "" ? null : Number(value));

const wholeNumber = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : NaN);
const decimal = (value: string) => (/^\d+(\.\d+)?$/.test(value.trim()) ? Number(value) : NaN);

// Mirrors the server's check, so a bad link is caught before saving.
const isGoogleMapsUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !GOOGLE_HOSTS.includes(url.hostname)) return false;
    if (url.hostname === "maps.google.com" || url.hostname === "maps.app.goo.gl") return true;
    return url.pathname.startsWith("/maps");
  } catch {
    return false;
  }
};

export const validateDraft = (draft: VenueDraft, mode: "create" | "edit"): DraftErrors => {
  const errors: DraftErrors = {};
  const optionalRate = (value: string) => (value.trim() === "" ? null : wholeNumber(value));
  const hourly = optionalRate(draft.startingPrice);
  const halfDay = optionalRate(draft.halfDayPrice);
  const day = optionalRate(draft.dayPassPrice);
  const rating = decimal(draft.rating);

  if (mode === "create") {
    if (!SLUG.test(draft.slug)) errors.slug = "Use 2 to 63 lowercase letters, numbers or hyphens.";
    else if (draft.slug === "new") errors.slug = "That address is reserved.";
  }
  if (draft.name.trim().length < 2) errors.name = "Enter a name.";
  if (draft.locality.trim().length < 2) errors.locality = "Enter a locality.";
  if (draft.city.trim().length < 2) errors.city = "Enter a city.";

  const notSoldHint = "Enter a price above ₹0, or leave it empty if it isn't sold.";
  if (hourly !== null && !(hourly > 0)) errors.startingPrice = notSoldHint;
  if (halfDay !== null && !(halfDay > 0)) errors.halfDayPrice = notSoldHint;
  if (day !== null && !(day > 0)) errors.dayPassPrice = notSoldHint;
  else if (day !== null && hourly !== null && hourly > day) errors.dayPassPrice = "A day pass can't cost less than one hour.";

  if (!(rating >= 0 && rating <= 5)) errors.rating = "Enter a rating from 0 to 5.";
  if (!(decimal(draft.distanceKm) >= 0)) errors.distanceKm = "Enter a distance of 0 or more.";

  if (draft.googleMapsUrl.trim() && !isGoogleMapsUrl(draft.googleMapsUrl.trim())) {
    errors.googleMapsUrl = "Use a Google Maps link.";
  }
  if (draft.opensAt && draft.closesAt && draft.closesAt <= draft.opensAt) {
    errors.closesAt = "Closing time must be after opening time.";
  }
  if (draft.workspaceTypes.length === 0) errors.workspaceTypes = "Pick at least one workspace type.";

  if (draft.hasOffer && draft.offerLabel.trim().length < 3) {
    errors.offerLabel = "Give the offer a short label, like Flat 20% OFF.";
  }
  if (draft.hasOffer && draft.offerDetails.trim().length < 10) {
    errors.offerDetails = "Explain what the offer covers.";
  }
  return errors;
};

export const toPayload = (draft: VenueDraft, mode: "create" | "edit"): Record<string, unknown> => ({
  ...(mode === "create" ? { slug: draft.slug } : { published: draft.published }),
  name: draft.name.trim(),
  locality: draft.locality.trim(),
  city: draft.city.trim(),
  description: draft.description.trim(),
  longDescription: draft.longDescription.trim(),
  rating: Number(draft.rating),
  distanceKm: Number(draft.distanceKm),
  googleMapsUrl: draft.googleMapsUrl.trim(),
  openDays: draft.openDays,
  opensAt: draft.opensAt,
  closesAt: draft.closesAt,
  openDaysLabel: draft.openDaysLabel.trim(),
  hoursNote: draft.hoursNote.trim(),
  image: draft.image,
  gallery: draft.gallery,
  amenities: draft.amenities,
  workspaceTypes: draft.workspaceTypes,
  rules: draft.rules.map((rule) => rule.trim()).filter(Boolean),
  startingPrice: priceOrNull(draft.startingPrice),
  halfDayPrice: priceOrNull(draft.halfDayPrice),
  dayPassPrice: priceOrNull(draft.dayPassPrice),
  priceUnit: draft.priceUnit,
  offer: draft.hasOffer ? { label: draft.offerLabel.trim(), details: draft.offerDetails.trim() } : null,
});

const FIELD_ALIASES: Record<string, string> = { "offer.label": "offerLabel", "offer.details": "offerDetails" };

const PUBLISH_CODES = ["MAP_REQUIRED", "COVER_REQUIRED", "HOURS_REQUIRED"];

type ApiErrorInfo = { code?: string; message: string; fields: Record<string, string> };

type ApiErrorView = { errors: DraftErrors; formError: string | null; revertPublished: boolean };

const SLUG_TAKEN = "That address is already used.";

/** Places a save failure beside its control and repeats it next to Save. */
export const errorsFromApi = (info: ApiErrorInfo): ApiErrorView => {
  if (info.code === "SLUG_TAKEN") {
    return { errors: { slug: SLUG_TAKEN }, formError: SLUG_TAKEN, revertPublished: false };
  }
  if (info.code && PUBLISH_CODES.includes(info.code)) {
    return { errors: { published: info.message }, formError: info.message, revertPublished: true };
  }
  if (info.code === "VALIDATION_FAILED") {
    const errors = Object.fromEntries(
      Object.entries(info.fields).map(([key, message]) => [FIELD_ALIASES[key] ?? key, message]),
    );
    return { errors, formError: "Check the highlighted fields.", revertPublished: false };
  }
  return { errors: {}, formError: info.message, revertPublished: false };
};

/** Our own seat-map change bumps the version once; any other jump is someone else's save. */
export const nextBaseVersion = (current: number, returned: number) =>
  returned === current + 1 ? returned : current;

type DraftState = "current" | "adopt" | "conflict";

/** What to do when the loaded venue is newer than the one the form started from. */
export const draftState = (input: { baseVersion: number; venueVersion: number; isDirty: boolean }): DraftState => {
  if (input.venueVersion <= input.baseVersion) return "current";
  return input.isDirty ? "conflict" : "adopt";
};
