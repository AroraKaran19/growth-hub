import { z } from "zod";

export const checkInSchema = z.union([
  z.object({ code: z.string().trim().min(1, "Scan or type a code.").max(200) }),
  z.object({ bookingRef: z.string().trim().min(1).max(40) }),
  z.object({ membershipRef: z.string().trim().min(1).max(40) }),
]);
