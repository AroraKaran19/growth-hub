import { Types } from "mongoose";
import { z } from "zod";
import { passwordProblem } from "../utils/password";

export const nameSchema = z.string().trim().min(2, "Enter a name.").max(80, "Keep the name under 80 characters.");

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{1,62}$/, "Use 2 to 63 lowercase letters, numbers or hyphens.");

export const objectIdSchema = z.string().refine((value) => Types.ObjectId.isValid(value), "Unknown id.");

export const passwordSchema = z.string().superRefine((value, ctx) => {
  const problem = passwordProblem(value);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});
