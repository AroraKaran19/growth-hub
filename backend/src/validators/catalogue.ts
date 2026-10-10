import { z } from "zod";
import {
  ADDON_UNITS,
  AMENITY_IDS,
  PRICE_UNITS,
  ROOM_TYPES,
  SEAT_TYPES,
  WORKSPACE_TYPES,
} from "../constants/catalogue";
import { toLocalityId } from "../services/catalogueRules";
import { emailSchema, nameSchema, objectIdSchema, passwordSchema, slugSchema } from "./common";

const GOOGLE_HOSTS = new Set(["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl"]);

export const isGoogleMapsUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !GOOGLE_HOSTS.has(url.hostname)) return false;
    if (url.hostname === "maps.google.com" || url.hostname === "maps.app.goo.gl") return true;
    return url.pathname.startsWith("/maps");
  } catch {
    return false;
  }
};

export const imageSchema = z
  .string()
  .trim()
  .refine(
    (value) => /^https:\/\/\S+$/.test(value) || /^\/assets\/[\w./-]+$/.test(value),
    "Use an uploaded image.",
  );

const rupees = z
  .number({ error: "Enter an amount." })
  .int("Use whole rupees.")
  .min(1, "Must be at least 1 rupee.")
  .max(10_000_000, "That amount is too large.");

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 09:30.");

const percent = z.number().min(0).max(100);

export const seatSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9-]{1,16}$/, "Use up to 16 letters, numbers or hyphens."),
    label: z.string().trim().min(1).max(40),
    type: z.enum(SEAT_TYPES),
    x: percent,
    y: percent,
    width: percent.refine((value) => value > 0, "Must be wider than 0."),
    height: percent.refine((value) => value > 0, "Must be taller than 0."),
    capacity: z.number().int().min(1).max(100).optional(),
  })
  .superRefine((seat, ctx) => {
    if (seat.x + seat.width > 100) {
      ctx.addIssue({ code: "custom", message: "Runs off the right edge.", path: ["width"] });
    }
    if (seat.y + seat.height > 100) {
      ctx.addIssue({ code: "custom", message: "Runs off the bottom edge.", path: ["height"] });
    }
    if (seat.capacity !== undefined && !ROOM_TYPES.has(seat.type)) {
      ctx.addIssue({ code: "custom", message: "Only rooms have a capacity.", path: ["capacity"] });
    }
  });

export const seatListSchema = z
  .array(seatSchema)
  .min(1, "A map needs at least one seat.")
  .max(500, "Up to 500 seats.")
  .superRefine((seats, ctx) => {
    const seen = new Set<string>();
    seats.forEach((seat, index) => {
      if (seen.has(seat.id)) {
        ctx.addIssue({ code: "custom", message: `Seat id ${seat.id} is used twice.`, path: [index, "id"] });
      }
      seen.add(seat.id);
    });
  });

export const createSeatMapSchema = z.object({
  name: z.string().trim().min(3, "Name the map.").max(80),
  image: imageSchema,
  seats: seatListSchema,
});

const lengthPrices = z
  .object({
    weekly: rupees.optional(),
    monthly: rupees.optional(),
    quarterly: rupees.optional(),
    halfYearly: rupees.optional(),
  })
  .strict();

const membershipPrices = z
  .object({
    desk: lengthPrices.optional(),
    "private-cabin": lengthPrices.optional(),
    office: lengthPrices.optional(),
  })
  .strict();

const venueFields = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(80),
  locality: z
    .string()
    .trim()
    .min(2, "Enter a locality.")
    .max(60)
    .refine((value) => toLocalityId(value).length >= 2, "Write the locality in English letters or numbers."),
  city: z.string().trim().min(2, "Enter a city.").max(60),
  image: z.union([imageSchema, z.literal("")]),
  gallery: z.array(imageSchema).max(12, "Up to 12 photos."),
  rating: z.number().min(0).max(5),
  startingPrice: rupees.nullable(),
  priceUnit: z.enum(PRICE_UNITS),
  halfDayPrice: rupees.nullable(),
  dayPassPrice: rupees.nullable(),
  membershipPrices,
  distanceKm: z.number().min(0).max(1000),
  description: z.string().trim().max(300),
  longDescription: z.string().trim().max(3000),
  openDays: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
  opensAt: z.union([time, z.literal("")]),
  closesAt: z.union([time, z.literal("")]),
  openDaysLabel: z.string().trim().max(40),
  hoursNote: z.string().trim().max(300),
  googleMapsUrl: z.union([
    z.string().trim().refine(isGoogleMapsUrl, "Use a Google Maps link."),
    z.literal(""),
  ]),
  rules: z.array(z.string().trim().min(1).max(200)).max(20, "Up to 20 rules."),
  offer: z
    .object({
      label: z.string().trim().min(3, "At least 3 characters.").max(40),
      details: z.string().trim().min(10, "At least 10 characters.").max(300),
    })
    .nullable(),
  workspaceTypes: z.array(z.enum(WORKSPACE_TYPES)).min(1, "Pick at least one workspace type."),
  amenities: z.array(z.enum(AMENITY_IDS)),
});

export const createVenueSchema = venueFields
  .partial()
  .required({
    name: true,
    locality: true,
    city: true,
    workspaceTypes: true,
  })
  // /admin/venues/new is the create page, so that address can never be a venue.
  .extend({ slug: slugSchema.refine((slug) => slug !== "new", "That address is reserved.") })
  .strict();

export const patchVenueSchema = venueFields
  .partial()
  .extend({
    published: z.boolean().optional(),
    version: z.number({ error: "Reload the venue and try again." }).int().min(0),
  })
  .strict();

/** What a venue's own staff may change about its prices; blank means not sold. */
export const venuePricesSchema = venueFields
  .pick({ startingPrice: true, halfDayPrice: true, dayPassPrice: true, membershipPrices: true })
  .partial()
  .strict()
  .refine((change) => Object.keys(change).length > 0, { message: "Nothing to change." });

export const assignSeatMapSchema = z.object({ seatMapId: objectIdSchema });

export const outOfServiceSchema = z.object({
  seatIds: z
    .array(z.string().min(1).max(16))
    .max(500)
    .transform((ids) => [...new Set(ids)]),
});

export const createAddonTypeSchema = z
  .object({
    key: slugSchema,
    name: z.string().trim().min(2, "Enter a name.").max(60),
    description: z.string().trim().max(200).default(""),
    unit: z.enum(ADDON_UNITS),
    sortOrder: z.number().int().min(0).max(1000).default(0),
  })
  .strict();

export const patchAddonTypeSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a name.").max(60).optional(),
    description: z.string().trim().max(200).optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict()
  .refine((change) => Object.keys(change).length > 0, { message: "Nothing to change." });

export const venueAddonsSchema = z.object({
  addons: z
    .array(z.object({ addonTypeId: objectIdSchema, price: rupees, enabled: z.boolean() }))
    .max(50)
    .superRefine((addons, ctx) => {
      const seen = new Set<string>();
      addons.forEach((addon, index) => {
        if (seen.has(addon.addonTypeId)) {
          ctx.addIssue({ code: "custom", message: "Listed twice.", path: [index, "addonTypeId"] });
        }
        seen.add(addon.addonTypeId);
      });
    }),
});

export const invitePartnerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  venueSlug: slugSchema,
  temporaryPassword: passwordSchema,
});

export const updatePartnerSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    temporaryPassword: passwordSchema.optional(),
    status: z.enum(["active", "disabled"]).optional(),
    venueSlug: slugSchema.optional(),
  })
  .refine((change) => Object.values(change).some((value) => value !== undefined), {
    message: "Nothing to change.",
  });

export type SeatInput = z.infer<typeof seatSchema>;
export type CreateSeatMapInput = z.infer<typeof createSeatMapSchema>;
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type PatchVenueInput = z.infer<typeof patchVenueSchema>;
export type CreateAddonTypeInput = z.infer<typeof createAddonTypeSchema>;
export type PatchAddonTypeInput = z.infer<typeof patchAddonTypeSchema>;
export type VenueAddonsInput = z.infer<typeof venueAddonsSchema>;
export type InvitePartnerInput = z.infer<typeof invitePartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;

export type VenuePricesInput = z.infer<typeof venuePricesSchema>;

export const labelSchema = z
  .object({
    kind: z.enum(["workspace-type", "amenity"]),
    key: z.string().trim().min(1).max(40),
    label: z.string().trim().max(40, "Keep it under 40 characters."),
  })
  .strict();
