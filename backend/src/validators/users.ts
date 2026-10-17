import { z } from "zod";
import { parsePhone } from "../utils/phone";
import { emailSchema, nameSchema } from "./common";

export const USER_KINDS = ["customer", "partner", "admin", "super-admin"] as const;

export type UserKind = (typeof USER_KINDS)[number];

export const listUsersQuerySchema = z.object({
  kind: z.enum(USER_KINDS).optional().catch(undefined),
  status: z.enum(["active", "disabled"]).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1).default(1),
});

const phoneSchema = z
  .object({ countryCode: z.string(), phoneNumber: z.string() })
  .transform((value, ctx) => {
    const parsed = parsePhone(value.countryCode, value.phoneNumber);
    if (!parsed) {
      ctx.addIssue({ code: "custom", message: "Enter a valid mobile number." });
      return z.NEVER;
    }
    return parsed;
  });

export const recordsPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1).default(1),
});

export const updateCustomerSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    status: z.enum(["active", "disabled"]).optional(),
  })
  .strict()
  .refine((change) => Object.values(change).some((value) => value !== undefined), {
    message: "Nothing to change.",
  });

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
