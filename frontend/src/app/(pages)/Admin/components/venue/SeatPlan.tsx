import type { ApiSeat } from "@/types/catalogue";
import { cn } from "@/utils";

type SeatPlanProps = {
  image: string;
  seats: ApiSeat[];
  /** Seats drawn as out of service. */
  isOff?: (seat: ApiSeat) => boolean;
  onToggle?: (seat: ApiSeat) => void;
  className?: string;
};

const boxStyle = (seat: ApiSeat) => ({
  left: `${seat.x}%`,
  top: `${seat.y}%`,
  width: `${seat.width}%`,
  height: `${seat.height}%`,
});

const SeatPlan = ({ image, seats, isOff, onToggle, className }: SeatPlanProps) => (
  <div className={cn("relative overflow-hidden rounded-xl border border-tertiary/10", className)}>
    {/* Plain img: the seat boxes are percentages of this exact image. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={image} alt="Floor plan" className="w-full select-none" draggable={false} />
    {seats.map((seat) => {
      const off = isOff?.(seat) ?? false;
      const tone = off
        ? "border-tertiary/40 bg-tertiary/35"
        : "border-green-600 bg-green-500/35";

      if (!onToggle) {
        return (
          <span
            key={seat.id}
            title={seat.label}
            style={boxStyle(seat)}
            className={cn("absolute rounded border-2", tone)}
          />
        );
      }
      return (
        <button
          key={seat.id}
          type="button"
          role="switch"
          aria-checked={!off}
          onClick={() => onToggle(seat)}
          title={`${seat.label}: ${off ? "out of service" : "bookable"}`}
          style={boxStyle(seat)}
          className={cn(
            "absolute rounded border-2 transition-colors",
            tone,
            off ? "hover:bg-tertiary/45" : "hover:bg-green-500/55",
          )}
        >
          <span className="sr-only">
            {seat.label} {off ? "out of service" : "bookable"}
          </span>
        </button>
      );
    })}
  </div>
);

export default SeatPlan;
