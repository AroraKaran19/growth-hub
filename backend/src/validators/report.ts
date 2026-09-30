import { z } from "zod";
import { REPORTS } from "../services/report.service";
import { isIsoDate } from "../utils/indiaTime";

const isoDate = z.string().refine(isIsoDate, "Pick a date.");

export const reportNameSchema = z.enum(REPORTS);

export const reportRangeSchema = z.object({
  from: isoDate,
  to: isoDate,
  venue: z.string().trim().max(80).optional(),
});
