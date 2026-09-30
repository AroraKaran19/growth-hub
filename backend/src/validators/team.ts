import { z } from "zod";
import { ADMIN_PERMISSIONS } from "../constants/permissions";
import { emailSchema, nameSchema, passwordSchema } from "./common";

const permissions = z
  .array(z.enum(ADMIN_PERMISSIONS, "Unknown section."))
  .min(1, "Pick at least one section.")
  .transform((list) => [...new Set(list)]);

export const inviteAdminSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  permissions,
  temporaryPassword: passwordSchema,
});

export const updateAdminSchema = z
  .object({
    permissions: permissions.optional(),
    status: z.enum(["active", "disabled"]).optional(),
  })
  .refine((change) => change.permissions !== undefined || change.status !== undefined, {
    message: "Nothing to change.",
  });

export type InviteAdminInput = z.infer<typeof inviteAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
