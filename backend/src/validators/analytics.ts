import { z } from "zod";

export const ANALYTICS_RANGES = ["7", "30", "90"] as const;

export const analyticsQuerySchema = z.object({
  venue: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Pick a venue.")
    .default("all"),
  days: z
    .enum(ANALYTICS_RANGES, { error: "Pick 7, 30 or 90 days." })
    .default("30")
    .transform(Number),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
