"use client";

import { useState } from "react";
import { Check, UserRound } from "lucide-react";
import type { SeatCheckIn } from "@/types/partner";
import { cn } from "@/utils";
import { CHECK_IN_BUTTON } from "./PartnerUi";

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

type SeatCheckInsProps = {
  seats: SeatCheckIn[];
  memberName: string;
  onCheckIn: (seatId: string) => Promise<unknown> | void;
  /** "picker" is the roomy list on the check-in screen; "chips" fits table cells. */
  variant?: "picker" | "chips";
  disabled?: boolean;
};

/** Each seat on a multi-seat plan, checked in one holder at a time. */
const SeatCheckIns = ({ seats, memberName, onCheckIn, variant = "chips", disabled }: SeatCheckInsProps) => {
  const [busySeat, setBusySeat] = useState<string | null>(null);

  const checkIn = async (seatId: string) => {
    setBusySeat(seatId);
    try {
      await onCheckIn(seatId);
    } finally {
      setBusySeat(null);
    }
  };

  if (variant === "picker") {
    return (
      <ul className="flex flex-col gap-2">
        {seats.map((seat, index) => (
          <li
            key={seat.seatId}
            style={{ animationDelay: `${index * 50}ms` }}
            className={cn(
              "flex animate-[fade-up_300ms_ease-out_both] items-center gap-3 rounded-xl border bg-secondary p-2.5 shadow-sm transition-shadow",
              seat.checkedInAt ? "border-blue-600/20" : "border-tertiary/10 hover:shadow-md",
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                seat.checkedInAt ? "bg-blue-600/12 text-blue-700" : "bg-tertiary text-secondary",
              )}
            >
              {seat.label}
            </span>
            <span className="min-w-0 grow">
              <span className="block truncate text-sm font-semibold text-tertiary">
                {seat.holder ?? <span className="font-normal text-tertiary/55">No holder named</span>}
              </span>
              <span className="block text-xs text-tertiary/55">
                {seat.checkedInAt ? `In since ${timeOf(seat.checkedInAt)}` : "Not in yet"}
              </span>
            </span>
            {seat.checkedInAt ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-600/10 px-2.5 py-1 text-xs font-medium text-blue-700">
                <Check aria-hidden="true" className="size-3.5" />
                In
              </span>
            ) : (
              <button
                type="button"
                disabled={disabled || busySeat !== null}
                onClick={() => void checkIn(seat.seatId)}
                className={cn(CHECK_IN_BUTTON, "shrink-0 disabled:opacity-60")}
              >
                {busySeat === seat.seatId ? "Checking..." : "Check in"}
                <span className="sr-only"> seat {seat.label}{seat.holder ? `, ${seat.holder}` : ""}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul aria-label={`Seats on ${memberName}'s plan`} className="flex flex-wrap gap-1.5">
      {seats.map((seat) => (
        <li
          key={seat.seatId}
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-1 text-xs",
            seat.checkedInAt ? "border-blue-600/20 bg-blue-600/8" : "border-tertiary/12 bg-secondary shadow-sm",
          )}
        >
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 font-semibold",
              seat.checkedInAt ? "bg-blue-600/15 text-blue-800" : "bg-tertiary text-secondary",
            )}
          >
            {seat.label}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1 text-tertiary/75">
            <UserRound aria-hidden="true" className="size-3 shrink-0 text-tertiary/40" />
            <span className="max-w-28 truncate">{seat.holder ?? "Unnamed"}</span>
          </span>
          {seat.checkedInAt ? (
            <span className="pr-1.5 font-medium text-blue-700">{timeOf(seat.checkedInAt)}</span>
          ) : (
            <button
              type="button"
              disabled={disabled || busySeat !== null}
              onClick={() => void checkIn(seat.seatId)}
              className="rounded-full px-2 py-0.5 font-medium text-primary transition-colors hover:bg-primary/8 disabled:opacity-50"
            >
              {busySeat === seat.seatId ? "..." : "Check in"}
              <span className="sr-only"> seat {seat.label}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

export default SeatCheckIns;
