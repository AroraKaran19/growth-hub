import catalogue from "@/config/catalogue-ids.json";

export type SeatType = "desk" | "private-cabin" | "office" | "meeting-room";

export const SEAT_TYPE_LABELS: Record<SeatType, string> = {
  desk: "Desk",
  "private-cabin": "Private cabin",
  office: "Office space",
  "meeting-room": "Meeting room",
};

if (Object.keys(SEAT_TYPE_LABELS).join() !== catalogue.seatTypes.join()) {
  throw new Error("SEAT_TYPE_LABELS must list the ids in config/catalogue-ids.json, in order");
}

export type Seat = {
  id: string;
  label: string;
  type: SeatType;
  /**
   * Region of the chair on the plan, as percentages of the image (0-100).
   * A box rather than a point so the whole chair is clickable and fillable.
   */
  x: number;
  y: number;
  width: number;
  height: number;
  available: boolean;
  /** Rooms only: how many people it seats. */
  capacity?: number;
};
