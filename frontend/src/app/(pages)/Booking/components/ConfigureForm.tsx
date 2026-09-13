"use client";

import { Minus, Plus } from "lucide-react";
import {
  ADDON_OPTIONS,
  BOOKING_TYPE_OPTIONS,
  MAX_SEATS,
  PARKING_OPTIONS,
  PREFERENCE_OPTIONS,
} from "@/data/bookingOptions";
import type { BookingSelection } from "@/types/booking";
import { SEAT_TYPE_LABELS, type SeatType } from "@/types/seat";
import ChipGroup from "./ChipGroup";

const SPACE_TYPE_OPTIONS = (Object.keys(SEAT_TYPE_LABELS) as SeatType[]).map(
  (value) => ({ value, label: SEAT_TYPE_LABELS[value] }),
);

type ConfigureFormProps = {
  selection: BookingSelection;
  onChange: <K extends keyof BookingSelection>(
    key: K,
    value: BookingSelection[K],
  ) => void;
  /** Relative so rapid clicks don't all read the same stale seat count. */
  onAdjustSeats: (delta: number) => void;
};

const STEP_BUTTON =
  "flex size-9 items-center justify-center rounded-lg border border-tertiary/15 text-tertiary transition-colors hover:border-tertiary/35 disabled:cursor-not-allowed disabled:opacity-40";

const ConfigureForm = ({
  selection,
  onChange,
  onAdjustSeats,
}: ConfigureFormProps) => {
  const toggleAddOn = (value: string) =>
    onChange(
      "addOns",
      selection.addOns.includes(value)
        ? selection.addOns.filter((item) => item !== value)
        : [...selection.addOns, value],
    );

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
      <ChipGroup
        label="What are you booking?"
        options={SPACE_TYPE_OPTIONS}
        value={selection.spaceType}
        onChange={(value) => onChange("spaceType", value as SeatType)}
      />

      <div className="border-t border-tertiary/8" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
        <fieldset>
          <legend className="text-sm font-medium text-tertiary">
            {selection.spaceType === "desk" ? "Seats required" : "People"}
          </legend>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onAdjustSeats(-1)}
              disabled={selection.seats <= 1}
              aria-label="Remove a seat"
              className={STEP_BUTTON}
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <span
              aria-live="polite"
              className="w-10 text-center text-lg font-semibold text-tertiary"
            >
              {selection.seats}
            </span>
            <button
              type="button"
              onClick={() => onAdjustSeats(1)}
              disabled={selection.seats >= MAX_SEATS}
              aria-label="Add a seat"
              className={STEP_BUTTON}
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
        </fieldset>

        <ChipGroup
          label="Booking type"
          options={BOOKING_TYPE_OPTIONS}
          value={selection.bookingType}
          onChange={(value) => onChange("bookingType", value)}
        />
      </div>

      <div className="border-t border-tertiary/8" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChipGroup
          label="Seating preference"
          options={PREFERENCE_OPTIONS}
          value={selection.preference}
          onChange={(value) => onChange("preference", value)}
        />
        <ChipGroup
          label="Parking"
          options={PARKING_OPTIONS}
          value={selection.parking}
          onChange={(value) => onChange("parking", value)}
        />
      </div>

      <ChipGroup
        label="Add ons"
        hint="(optional, pick any)"
        options={ADDON_OPTIONS}
        value={selection.addOns}
        onChange={toggleAddOn}
      />

      <label className="block max-w-sm">
        <span className="mb-2 block text-sm font-medium text-tertiary">
          Company name
          <span className="ml-1.5 font-normal text-tertiary/45">
            (optional)
          </span>
        </span>
        <input
          type="text"
          value={selection.companyName}
          onChange={(event) => onChange("companyName", event.target.value)}
          placeholder="For your invoice"
          className="w-full rounded-lg border border-tertiary/15 bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 hover:border-tertiary/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </label>
    </div>
  );
};

export default ConfigureForm;
