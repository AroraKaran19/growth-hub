import type { CSSProperties } from "react";
import { LayoutGrid } from "lucide-react";
import { rupees } from "@/app/components/shared/OverviewUi";
import { SEAT_TYPE_LABELS } from "@/types/seat";
import type { WorkspaceAnalytics } from "@/types/analytics";
import { ChartCard, DataTable, hoursLabel, percent } from "./analyticsUi";
import BarList from "./BarList";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Occupancy and money side by side as two charts, each on its own scale. */
const SpaceTypes = ({
  rows,
  showsMoney,
  style,
  className,
}: {
  rows: WorkspaceAnalytics["spaceTypes"];
  showsMoney: boolean;
  style?: CSSProperties;
  className?: string;
}) => {
  const label = (type: keyof typeof SEAT_TYPE_LABELS) => SEAT_TYPE_LABELS[type];
  const withSeats = rows.filter((row) => row.seats > 0);

  const table = (
    <DataTable
      caption="Occupancy by space type"
      head={["Space", "Units", "Occupancy", "Booked", "Open", ...(showsMoney ? ["Collected"] : [])]}
      rows={rows.map((row) => [
        label(row.type),
        row.seats,
        percent(row.occupancy, 1),
        hoursLabel(row.bookedHours),
        hoursLabel(row.openHours),
        ...(showsMoney ? [rupees(row.revenue ?? 0)] : []),
      ])}
    />
  );

  return (
    <ChartCard
      icon={LayoutGrid}
      title="By space type"
      hint={showsMoney ? "How full each kind of space ran, and what it brought in" : "How full each kind of space ran"}
      table={table}
      empty={rows.length === 0 ? "No seats on a map yet, so there's nothing to split by space type." : null}
      style={style}
      className={className}
    >
      <div className="@container">
        <div className={showsMoney ? "grid gap-6 @lg:grid-cols-2" : ""}>
          <div>
            <p className="mb-3 text-xs font-medium text-tertiary/55">Occupancy</p>
            <BarList
              max={1}
              bars={withSeats.map((row) => ({
                key: row.type,
                label: label(row.type),
                note: plural(row.seats, "unit"),
                value: row.occupancy ?? 0,
                display: percent(row.occupancy, 1),
                detail: `${hoursLabel(row.bookedHours)} of ${hoursLabel(row.openHours)}`,
              }))}
            />
          </div>
          {showsMoney && (
            <div>
              <p className="mb-3 text-xs font-medium text-tertiary/55">Collected</p>
              <BarList
                bars={rows.map((row) => ({
                  key: row.type,
                  label: label(row.type),
                  value: row.revenue ?? 0,
                  display: rupees(row.revenue ?? 0),
                }))}
              />
            </div>
          )}
        </div>
      </div>
      <div className="sr-only">{table}</div>
    </ChartCard>
  );
};

export default SpaceTypes;
