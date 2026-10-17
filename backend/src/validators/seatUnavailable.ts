import { z } from "zod";
import { isIsoDate } from "../utils/indiaTime";

const DAY_MINUTES = 24 * 60;

const moment = z
  .object({
    date: z.string().refine(isIsoDate, "Pick a day."),
    minutes: z
      .number({ error: "Pick a time." })
      .int("Pick a time.")
      .min(0, "Pick a time.")
      .max(DAY_MINUTES, "Pick a time.")
      .refine((minutes) => minutes % 30 === 0, "Pick a time on the half hour."),
  })
  .strict();

export const seatUnavailableSchema = z
  .object({
    reason: z.enum(["out-of-service", "taken"], "Pick what happened."),
    from: moment,
    until: moment.nullable(),
  })
  .strict()
  .refine((body) => body.until !== null || body.reason === "out-of-service", {
    message: "Pick when it ends.",
    path: ["until"],
  });

export type SeatUnavailableInput = z.infer<typeof seatUnavailableSchema>;
export type SeatMoment = z.infer<typeof moment>;
