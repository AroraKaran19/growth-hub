import { z } from "zod";

const seatId = z.string().trim().min(1, "Pick a seat.").max(60);

export const seatChangeSchema = z
  .object({
    fromSeatId: seatId,
    toSeatId: seatId,
    note: z.string().trim().max(500, "Keep the message under 500 characters.").default(""),
  })
  .strict();

export type SeatChangeBody = z.infer<typeof seatChangeSchema>;
