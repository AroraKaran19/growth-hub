import { z } from "zod";
import { ADMIN_PERMISSIONS, ADMIN_ROLES } from "../constants/permissions";
import { emailSchema, nameSchema, passwordSchema } from "./common";

const permissions = z
  .array(z.enum(ADMIN_PERMISSIONS, "Unknown section."))
  .min(1, "Pick at least one section.")
  .transform((list) => [...new Set(list)]);

const role = z.enum(ADMIN_ROLES, "Pick a role.");

// Super admins hold everything, so only admins need sections.
const needsSections = (change: { role?: string; permissions?: string[] }, ctx: z.RefinementCtx) => {
  if (change.role === "admin" && !change.permissions) {
    ctx.addIssue({ code: "custom", path: ["permissions"], message: "Pick at least one section." });
  }
};

export const inviteAdminSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    role: role.default("admin"),
    permissions: permissions.optional(),
    temporaryPassword: passwordSchema,
  })
  .superRefine(needsSections)
  .transform((input) => ({ ...input, permissions: input.role === "super-admin" ? [] : input.permissions! }));

export const updateAdminSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    temporaryPassword: passwordSchema.optional(),
    role: role.optional(),
    permissions: permissions.optional(),
    status: z.enum(["active", "disabled"]).optional(),
  })
  .refine((change) => Object.values(change).some((value) => value !== undefined), {
    message: "Nothing to change.",
  });

export type InviteAdminInput = z.infer<typeof inviteAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
