import { z } from "zod";
import { FEATURE_ICONS } from "../constants/featureIcons";
import { imageSchema } from "./catalogue";

const text = (max: number) => z.string().trim().min(1, "Fill this in.").max(max, `Keep it under ${max} characters.`);

// Site paths or https links only, so a saved link can never run script.
const href = z
  .string()
  .trim()
  .max(300)
  .refine((value) => /^\/[^\s]*$/.test(value) || /^https:\/\/\S+$/.test(value), "Use a site path like /locations or an https link.");

const image = z.object({ src: imageSchema, alt: z.string().trim().max(160, "Keep it under 160 characters.") }).strict();

const heading = { title: text(90), subtitle: text(300) };

const link = z.object({ label: text(40), href }).strict();

export const HOME_SECTION_SCHEMAS = {
  hero: z
    .object({
      pill: z.object({ show: z.boolean(), text: text(90), href: z.union([href, z.literal("")]) }).strict(),
      title: text(90),
      subtitle: text(300),
      image,
    })
    .strict(),
  discover: z.object(heading).strict(),
  features: z
    .object({
      ...heading,
      cards: z
        .array(z.object({ icon: z.enum(FEATURE_ICONS, "Pick an icon from the list."), title: text(60), description: text(220) }).strict())
        .length(6, "Keep exactly six cards."),
    })
    .strict(),
  categories: z.object(heading).strict(),
  steps: z
    .object({
      ...heading,
      items: z.array(z.object({ title: text(40), description: text(180) }).strict()).length(4, "Keep exactly four steps."),
    })
    .strict(),
  amenities: z.object({ ...heading, image }).strict(),
  community: z.object({ ...heading, photos: z.array(image).length(6, "Keep exactly six photos.") }).strict(),
  testimonials: z.object(heading).strict(),
  cta: z.object({ title: text(90), text: text(300), primary: link, secondary: link }).strict(),
};

export type HomeSection = keyof typeof HOME_SECTION_SCHEMAS;

export const HOME_SECTIONS = Object.keys(HOME_SECTION_SCHEMAS) as HomeSection[];

export const isHomeSection = (value: string): value is HomeSection => (HOME_SECTIONS as string[]).includes(value);

export const testimonialSchema = z
  .object({
    quote: text(500),
    name: text(80),
    role: z.string().trim().max(80, "Keep it under 80 characters."),
    photo: image.nullable(),
    visible: z.boolean(),
  })
  .strict();

export const testimonialOrderSchema = z.object({ ids: z.array(z.string().regex(/^[a-f0-9]{24}$/)).min(1).max(200) }).strict();

export type TestimonialInput = z.infer<typeof testimonialSchema>;
