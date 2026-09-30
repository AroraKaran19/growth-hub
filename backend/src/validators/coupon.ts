import { z } from "zod";
import { COUPON_CODE_PATTERN, COUPON_KINDS, COUPON_SCOPES, COUPON_VISIBILITY } from "../constants/coupons";
import { isIsoDate } from "../utils/indiaTime";

const isoDate = z.string().refine(isIsoDate, "Pick a date.");
const paise = z.number().int().min(0).max(100_000_000);

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(COUPON_CODE_PATTERN, "Use 4 to 16 letters or digits.");

const editable = {
  title: z.string().trim().min(2, "Enter a title.").max(60),
  description: z.string().trim().max(200),
  kind: z.enum(COUPON_KINDS),
  value: z.number().int().min(1, "Enter an amount."),
  maxDiscount: paise.positive().nullable(),
  minSpend: paise,
  appliesTo: z.enum(COUPON_SCOPES),
  startsOn: isoDate,
  endsOn: isoDate,
  perMemberLimit: z.number().int().min(1).max(100),
  totalLimit: z.number().int().min(1).max(1_000_000).nullable(),
  visibility: z.enum(COUPON_VISIBILITY),
  active: z.boolean(),
};

export const createCouponSchema = z
  .object({
    code: couponCodeSchema,
    title: editable.title,
    description: editable.description.default(""),
    kind: editable.kind,
    value: editable.value,
    maxDiscount: editable.maxDiscount.default(null),
    minSpend: editable.minSpend.default(0),
    appliesTo: editable.appliesTo.default("any"),
    startsOn: editable.startsOn,
    endsOn: editable.endsOn,
    perMemberLimit: editable.perMemberLimit.default(1),
    totalLimit: editable.totalLimit.default(null),
    visibility: editable.visibility.default("code-only"),
    active: editable.active.default(true),
  })
  .strict();

export const patchCouponSchema = z
  .object(editable)
  .partial()
  .strict()
  .refine((change) => Object.keys(change).length > 0, { message: "Nothing to change." });

export const walletCodeSchema = z.object({ code: z.string().trim().min(1, "Enter a coupon code.").max(40) });

export const applyCouponSchema = walletCodeSchema;
