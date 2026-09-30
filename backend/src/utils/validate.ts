import type { z } from "zod";
import { AppError } from "../middlewares/error.middleware";

export const parseBody = <T extends z.ZodType>(schema: T, body: unknown): z.infer<T> => {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".") || "body";
    fields[key] ??= issue.message;
  }
  throw new AppError("Check the highlighted fields.", 400, "VALIDATION_FAILED", { fields });
};
