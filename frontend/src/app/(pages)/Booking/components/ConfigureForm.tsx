"use client";

import { Minus, Plus } from "lucide-react";
import {
  ADDON_OPTIONS,
  MAX_HOURS,
  MAX_SEATS,
  MEMBERSHIP_TYPE_OPTIONS,
  PARKING_OPTIONS,
  PASS_TYPE_OPTIONS,
  PREFERENCE_OPTIONS,
} from "@/data/bookingOptions";
import {
  isMembershipType,
  type BookingSelection,
  type BookingType,
} from "@/types/booking";
import { SEAT_TYPE_LABELS, type SeatType } from "@/types/seat";
import ChipGroup from "./ChipGroup";

const SPACE_TYPES = Object.keys(SEAT_TYPE_LABELS) as SeatType[];

type ConfigureFormProps = {
  selection: BookingSelection;
  onChange: <K extends keyof BookingSelection>(
    key: K,
    value: BookingSelection[K],
  ) => void;
  /** Relative so rapid clicks don't all read the same stale count. */
  onAdjustSeats: (delta: number) => void;
  onAdjustHours: (delta: number) => void;
};

const STEP_BUTTON =
  "flex size-9 items-center justify-center rounded-lg border border-tertiary/15 text-tertiary transition-colors hover:border-tertiary/35 disabled:cursor-not-allowed disabled:opacity-40";

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  noun: string;
  onAdjust: (delta: number) => void;
};

const Stepper = ({ label, value, min, max, noun, onAdjust }: StepperProps) => (
  <fieldset>
    <legend className="text-sm font-medium text-tertiary">{label}</legend>
    <div className="mt-2 flex items-center gap-3">
      <button
        type="button"
        onClick={() => onAdjust(-1)}
        disabled={value <= min}
        aria-label={`Remove a ${noun}`}
        className={STEP_BUTTON}
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <span
        aria-live="polite"
        className="w-10 text-center text-lg font-semibold text-tertiary"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onAdjust(1)}
        disabled={value >= max}
        aria-label={`Add a ${noun}`}
        className={STEP_BUTTON}
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  </fieldset>
);

const ConfigureForm = ({
  selection,
  onChange,
  onAdjustSeats,
  onAdjustHours,
}: ConfigureFormProps) => {
  const isMembership = isMembershipType(selection.bookingType);
  const isDesk = selection.spaceType === "desk";

  // A membership reserves a desk, cabin or office; meeting rooms stay hourly.
  const spaceOptions = SPACE_TYPES.filter(
    (type) => !isMembership || type !== "meeting-room",
  ).map((value) => ({
    value,
    label:
      isMembership && value === "desk"
        ? "Dedicated desk"
        : SEAT_TYPE_LABELS[value],
  }));

  const toggleAddOn = (value: string) =>
    onChange(
      "addOns",
      selection.addOns.includes(value)
        ? selection.addOns.filter((item) => item !== value)
        : [...selection.addOns, value],
    );

  const setBookingType = (value: string) =>
    onChange("bookingType", value as BookingType);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChipGroup
          label="Pass"
          hint="(one visit)"
          options={PASS_TYPE_OPTIONS}
          value={selection.bookingType}
          onChange={setBookingType}
        />
        <ChipGroup
          label="Membership"
          hint="(your seat reserved for the whole plan)"
          options={MEMBERSHIP_TYPE_OPTIONS}
          value={selection.bookingType}
          onChange={setBookingType}
        />
      </div>

      <div className="border-t border-tertiary/8" />

      <div>
        <ChipGroup
          label="What are you booking?"
          options={spaceOptions}
          value={selection.spaceType}
          onChange={(value) => onChange("spaceType", value as SeatType)}
        />
        {isMembership && (
          <p className="mt-2 text-xs text-tertiary/55">
            Meeting rooms are booked by the hour, so they are not part of a
            membership. Members get included meeting room hours instead.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-x-12 gap-y-6">
        <Stepper
          label={
            isDesk
              ? isMembership
                ? "Desks to reserve"
                : "Seats required"
              : "People"
          }
          value={selection.seats}
          min={1}
          max={MAX_SEATS}
          noun={isDesk ? "seat" : "person"}
          onAdjust={onAdjustSeats}
        />
        {selection.bookingType === "hourly" && (
          <Stepper
            label="Hours"
            value={selection.hours}
            min={1}
            max={MAX_HOURS}
            noun="hour"
            onAdjust={onAdjustHours}
          />
        )}
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
          name="companyName"
          autoComplete="organization"
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
