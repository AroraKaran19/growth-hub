import type { CSSProperties } from "react";
import { Armchair } from "lucide-react";
import type { SeatUse } from "@/types/analytics";
import { SEAT_TYPE_LABELS } from "@/types/seat";
import { ChartCard, DataTable, hoursLabel, percent } from "./analyticsUi";
import BarList from "./BarList";

const SHOWN = 5;

const barsOf = (seats: SeatUse[]) =>
  seats.map((seat) => ({
    key: seat.id,
    label: seat.label,
    note: SEAT_TYPE_LABELS[seat.type],
    value: seat.occupancy ?? 0,
    display: percent(seat.occupancy, 1),
    detail: `${hoursLabel(seat.bookedHours)} of ${hoursLabel(seat.openHours)}`,
  }));

/** Seats arrive busiest first; small maps show every seat in one list. */
const SeatUtilisation = ({ seats, style }: { seats: SeatUse[]; style?: CSSProperties }) => {
  const split = seats.length > SHOWN + 1;
  const most = split ? seats.slice(0, SHOWN) : seats;
  const least = split ? seats.slice(Math.max(SHOWN, seats.length - SHOWN)).reverse() : [];

  const table = (
    <DataTable
      caption="Share of open hours booked, per seat"
      head={["Seat", "Type", "Booked share", "Booked", "Open"]}
      rows={seats.map((seat) => [
        seat.label,
        SEAT_TYPE_LABELS[seat.type],
        percent(seat.occupancy, 1),
        hoursLabel(seat.bookedHours),
        hoursLabel(seat.openHours),
      ])}
    />
  );

  return (
    <ChartCard
      icon={Armchair}
      title="Seat utilisation"
      hint="Share of each seat's open hours that were booked"
      table={table}
      empty={seats.length === 0 ? "This venue has no seat map yet." : null}
      style={style}
    >
      <div className={split ? "grid gap-6 sm:grid-cols-2" : ""}>
        <div>
          {split && <p className="mb-3 text-xs font-medium text-tertiary/55">Most used</p>}
          <BarList max={1} bars={barsOf(most)} />
        </div>
        {split && (
          <div>
            <p className="mb-3 text-xs font-medium text-tertiary/55">Least used</p>
            <BarList max={1} bars={barsOf(least)} />
          </div>
        )}
      </div>
      <div className="sr-only">{table}</div>
    </ChartCard>
  );
};

export default SeatUtilisation;
