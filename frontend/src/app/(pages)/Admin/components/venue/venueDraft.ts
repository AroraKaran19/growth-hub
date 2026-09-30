import type { AdminVenue, MembershipLengthKey, MembershipSpace } from "@/types/catalogue";

type PriceCells = Record<MembershipSpace, Record<MembershipLengthKey, string>>;

export type VenueDraft = {
  slug: string;
  name: string;
  locality: string;
  city: string;
  description: string;
  longDescription: string;
  rating: string;
  seatsAvailable: string;
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
  dayPassPrice: string;
  priceUnit: "hr" | "day" | "month";
  membershipPrices: PriceCells;
  hasOffer: boolean;
  offerLabel: string;
  offerDetails: string;
  published: boolean;
};

export type DraftErrors = Partial<Record<string, string>>;

const SPACES: MembershipSpace[] = ["desk", "private-cabin", "office"];
const LENGTHS: MembershipLengthKey[] = ["weekly", "monthly", "quarterly", "halfYearly"];

const emptyCells = (): PriceCells =>
  Object.fromEntries(
    SPACES.map((space) => [space, Object.fromEntries(LENGTHS.map((length) => [length, ""]))]),
  ) as PriceCells;

export const EMPTY_DRAFT: VenueDraft = {
  slug: "",
  name: "",
  locality: "",
  city: "Bangalore",
  description: "",
  longDescription: "",
  rating: "0",
  seatsAvailable: "0",
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
  dayPassPrice: "",
  priceUnit: "hr",
  membershipPrices: emptyCells(),
  hasOffer: false,
  offerLabel: "",
  offerDetails: "",
  published: false,
};

export const toDraft = (venue: AdminVenue): VenueDraft => {
  const cells = emptyCells();
  for (const space of SPACES) {
    for (const length of LENGTHS) {
      const price = venue.membershipPrices[space]?.[length];
      if (price !== undefined) cells[space][length] = String(price);
    }
  }

  return {
    slug: venue.slug,
    name: venue.name,
    locality: venue.locality,
    city: venue.city,
    description: venue.description,
    longDescription: venue.longDescription,
    rating: String(venue.rating),
    seatsAvailable: String(venue.seatsAvailable),
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
    startingPrice: String(venue.startingPrice),
    dayPassPrice: String(venue.dayPassPrice),
    priceUnit: venue.priceUnit,
    membershipPrices: cells,
    hasOffer: Boolean(venue.offer),
    offerLabel: venue.offer?.label ?? "",
    offerDetails: venue.offer?.details ?? "",
    published: venue.published,
  };
};

export const slugFromName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);

const SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;
const GOOGLE_HOSTS = ["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl"];

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
  const hourly = wholeNumber(draft.startingPrice);
  const day = wholeNumber(draft.dayPassPrice);
  const rating = decimal(draft.rating);

  if (mode === "create") {
    if (!SLUG.test(draft.slug)) errors.slug = "Use 2 to 63 lowercase letters, numbers or hyphens.";
    else if (draft.slug === "new") errors.slug = "That address is reserved.";
  }
  if (draft.name.trim().length < 2) errors.name = "Enter a name.";
  if (draft.locality.trim().length < 2) errors.locality = "Enter a locality.";
  if (draft.city.trim().length < 2) errors.city = "Enter a city.";

  if (!(hourly > 0)) errors.startingPrice = "Enter an hourly rate above ₹0.";
  if (!(day > 0)) errors.dayPassPrice = "Enter a day pass rate above ₹0.";
  else if (hourly > day) errors.dayPassPrice = "A day pass can't cost less than one hour.";

  if (!(wholeNumber(draft.seatsAvailable) >= 0)) errors.seatsAvailable = "Enter a whole number of seats.";
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

  for (const space of SPACES) {
    for (const length of LENGTHS) {
      const cell = draft.membershipPrices[space][length].trim();
      if (cell && !(wholeNumber(cell) > 0)) {
        errors[`membershipPrices.${space}.${length}`] = "Whole rupees above 0, or leave blank.";
      }
    }
  }
  return errors;
};

export const toPayload = (draft: VenueDraft, mode: "create" | "edit"): Record<string, unknown> => {
  const membershipPrices: Record<string, Record<string, number>> = {};
  for (const space of SPACES) {
    const row: Record<string, number> = {};
    for (const length of LENGTHS) {
      const cell = draft.membershipPrices[space][length].trim();
      if (cell) row[length] = Number(cell);
    }
    if (Object.keys(row).length > 0) membershipPrices[space] = row;
  }

  return {
    ...(mode === "create" ? { slug: draft.slug } : { published: draft.published }),
    name: draft.name.trim(),
    locality: draft.locality.trim(),
    city: draft.city.trim(),
    description: draft.description.trim(),
    longDescription: draft.longDescription.trim(),
    rating: Number(draft.rating),
    seatsAvailable: Number(draft.seatsAvailable),
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
    startingPrice: Number(draft.startingPrice),
    dayPassPrice: Number(draft.dayPassPrice),
    priceUnit: draft.priceUnit,
    membershipPrices,
    offer: draft.hasOffer ? { label: draft.offerLabel.trim(), details: draft.offerDetails.trim() } : null,
  };
};

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
