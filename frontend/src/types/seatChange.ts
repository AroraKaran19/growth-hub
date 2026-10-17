/** One seat move by venue or Growth Hub staff, newest last; labels, not ids. */
export type SeatChange = {
  at: string;
  by: { type: "admin" | "partner"; name: string };
  from: string;
  to: string;
  /** The first day the new seat applies. */
  fromDate: string;
  note: string;
};

export type SeatOption = { id: string; label: string; type: string };

export type SeatOptions = {
  seats: (SeatOption & { holder: string | null })[];
  /** Free seats for the whole affected period, of the same types as the current seats. */
  options: SeatOption[];
  from: string;
  days: number;
};

export type SeatChangeInput = { fromSeatId: string; toSeatId: string; note?: string };
