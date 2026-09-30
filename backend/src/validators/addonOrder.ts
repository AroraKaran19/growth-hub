import { z } from "zod";
import { isIsoDate } from "../utils/indiaTime";

const dates = z.array(z.string().refine(isIsoDate, "Pick a date.")).min(1, "Pick at least one day.").max(31);
const addonKeys = z.array(z.string().trim().min(1).max(40)).min(1, "Pick at least one add-on.").max(10);

export const appOrderSchema = z.object({ dates, addonKeys });

export const deskOrderSchema = z.union([
  z.object({ bookingRef: z.string().trim().min(1).max(40), addonKeys }),
  z.object({ membershipRef: z.string().trim().min(1).max(40), dates, addonKeys }),
]);
