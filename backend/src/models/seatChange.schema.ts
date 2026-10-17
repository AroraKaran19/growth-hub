import { Schema } from "mongoose";

/** One move of a booking's or membership's seat by venue or Growth Hub staff. */
export type SeatChange = {
  at: Date;
  by: { type: "admin" | "partner"; id: string; name: string };
  from: { id: string; label: string };
  to: { id: string; label: string };
  /** The first day the new seat applies. */
  fromDate: string;
  note: string;
};

export type SeatChangeView = { at: string; by: { type: "admin" | "partner"; name: string }; from: string; to: string; fromDate: string; note: string };

export const seatChangesView = (changes: SeatChange[] | undefined): SeatChangeView[] =>
  (changes ?? []).map((change) => ({
    at: new Date(change.at).toISOString(),
    by: { type: change.by.type, name: change.by.name },
    from: change.from.label,
    to: change.to.label,
    fromDate: change.fromDate,
    note: change.note,
  }));

const seatRefSchema =new Schema({ id: String, label: String }, { _id: false });

export const seatChangeSchema = new Schema<SeatChange>(
  {
    at: { type: Date, required: true },
    by: { type: new Schema({ type: String, id: String, name: String }, { _id: false }), required: true },
    from: { type: seatRefSchema, required: true },
    to: { type: seatRefSchema, required: true },
    fromDate: { type: String, required: true },
    note: { type: String, default: "" },
  },
  { _id: false },
);
