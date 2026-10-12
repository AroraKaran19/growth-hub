import { z } from "zod";

// A multi-seat membership checks in one seat at a time.
const seatId = z.string().trim().min(1).max(40).optional();

export const checkInSchema = z.union([
  z.object({ code: z.string().trim().min(1, "Scan or type a code.").max(200), seatId }),
  z.object({ bookingRef: z.string().trim().min(1).max(40) }),
  z.object({ membershipRef: z.string().trim().min(1).max(40), seatId }),
]);
