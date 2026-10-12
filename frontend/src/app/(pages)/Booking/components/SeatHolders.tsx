"use client";

import { UsersRound } from "lucide-react";
import type { Seat } from "@/types/seat";
import { HOLDER_NAME_MAX } from "../checkoutState";

type SeatHoldersProps = {
  seatIds: string[];
  seats: Seat[];
  holders: Record<string, string>;
  onChange: (seatId: string, name: string) => void;
};

/** Optional names for each desk on a plan, shown to the front desk at check-in. */
const SeatHolders = ({ seatIds, seats, holders, onChange }: SeatHoldersProps) => (
  <section
    aria-labelledby="seat-holders-title"
    className="mt-5 overflow-hidden rounded-2xl border border-tertiary/10 bg-secondary shadow-sm"
  >
    <div className="flex items-start gap-3.5 border-b border-tertiary/8 px-5 py-4 lg:px-6">
      <span className="bg-icon-tile flex size-10 shrink-0 items-center justify-center rounded-xl text-secondary shadow-lg shadow-primary/25">
        <UsersRound aria-hidden="true" className="size-5" />
      </span>
      <div>
        <h2 id="seat-holders-title" className="text-base font-bold text-tertiary">
          Who sits where?
          <span className="ml-1.5 text-sm font-normal text-tertiary/45">(optional)</span>
        </h2>
        <p className="mt-0.5 text-sm text-tertiary/60">
          Name the person on each desk so reception can check them in. Leave a desk blank if it&apos;s yours.
        </p>
      </div>
    </div>

    <ul className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:p-6">
      {seatIds.map((seatId, index) => {
        const label = seats.find((seat) => seat.id === seatId)?.label ?? seatId;
        const inputId = `holder-${seatId}`;
        return (
          <li
            key={seatId}
            className="flex animate-[fade-up_0.3s_ease-out_both] items-center gap-3 rounded-xl border border-tertiary/10 bg-surface p-2 pl-3 motion-reduce:animate-none"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <label
              htmlFor={inputId}
              className="shrink-0 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-800"
            >
              {label}
            </label>
            <input
              id={inputId}
              type="text"
              autoComplete="off"
              maxLength={HOLDER_NAME_MAX}
              value={holders[seatId] ?? ""}
              onChange={(event) => onChange(seatId, event.target.value)}
              placeholder="Employee's name"
              className="min-w-0 grow rounded-lg border border-tertiary/12 bg-secondary px-3 py-2 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 hover:border-tertiary/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </li>
        );
      })}
    </ul>
  </section>
);

export default SeatHolders;
