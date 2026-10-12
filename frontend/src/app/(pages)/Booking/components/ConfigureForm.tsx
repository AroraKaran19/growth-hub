"use client";

import { Minus, PackagePlus, Plus, ReceiptText } from "lucide-react";
import PlanCard from "@/app/components/ui/PlanCard";
import {
  MAX_HOURS,
  MAX_SEATS,
  PASS_TYPE_OPTIONS,
  PREFERENCE_OPTIONS,
} from "@/data/bookingOptions";
import {
  isMembershipType,
  type BookingSelection,
  type BookingType,
  type PassType,
} from "@/types/booking";
import type { AddonUnit } from "@/types/catalogue";
import type { VenuePlan } from "@/types/membership";
import type { PlanLength } from "@/types/membershipPlan";
import { SEAT_TYPE_LABELS, type SeatType } from "@/types/seat";
import type { VenueDetail } from "@/types/venue";
import { cn } from "@/utils";
import { KEY_FROM_LENGTH, PLAN_LENGTH_LABELS, pricedLengths } from "@/utils/plans";
import { spaceTypesFor } from "../selectionRules";
import ChipGroup from "./ChipGroup";

const ADDON_UNIT_SUFFIX: Record<AddonUnit, string> = {
  "per-booking": "",
  "per-person": " per person",
  "per-day": " per day",
};

type ConfigureFormProps = {
  venue: VenueDetail;
  selection: BookingSelection;
  /** Undefined while the venue's plans load. */
  plans: VenuePlan[] | undefined;
  plan: VenuePlan | null;
  maxSeats: number;
  onChange: <K extends keyof BookingSelection>(
    key: K,
    value: BookingSelection[K],
  ) => void;
  onChoosePass: (type: PassType) => void;
  onChoosePlan: (plan: VenuePlan) => void;
  onChooseLength: (length: PlanLength) => void;
  /** Relative so rapid clicks don't all read the same stale count. */
  onAdjustSeats: (delta: number) => void;
  onAdjustHours: (delta: number) => void;
};

const CARD = "flex flex-col gap-6 rounded-2xl border border-tertiary/10 bg-secondary p-5 shadow-sm lg:p-6";

const STEP_BUTTON =
  "flex size-9 items-center justify-center rounded-lg border border-tertiary/15 text-tertiary transition-colors hover:border-tertiary/35 disabled:cursor-not-allowed disabled:opacity-40";

type StepperProps = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  noun: string;
  onAdjust: (delta: number) => void;
};

const Stepper = ({ label, hint, value, min, max, noun, onAdjust }: StepperProps) => (
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
    {hint && <p className="mt-2 text-xs text-tertiary/55">{hint}</p>}
  </fieldset>
);

const PlanDetails = ({
  plan,
  selection,
  maxSeats,
  hasAddons,
  onChooseLength,
  onAdjustSeats,
}: {
  plan: VenuePlan;
  selection: BookingSelection;
  maxSeats: number;
  hasAddons: boolean;
  onChooseLength: (length: PlanLength) => void;
  onAdjustSeats: (delta: number) => void;
}) => {
  const isDesk = plan.space === "desk";
  const current = isMembershipType(selection.bookingType) ? KEY_FROM_LENGTH[selection.bookingType] : null;

  return (
    <div className={CARD}>
      <div>
        <h2 className="text-base font-bold text-tertiary">{plan.name}</h2>
        <p className="mt-0.5 text-sm text-tertiary/60">
          Pick how long each billing period runs. It renews automatically until you stop it.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-tertiary">
          Plan length
          <span className="ml-1.5 font-normal text-tertiary/45">
            ({isDesk ? "price per seat" : "price per room"})
          </span>
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {pricedLengths(plan).map((length) => {
            const isActive = current === length;
            return (
              <button
                key={length}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChooseLength(length)}
                className={cn(
                  "flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-all sm:min-w-32",
                  isActive
                    ? "border-primary bg-primary/8 shadow-md shadow-primary/10"
                    : "border-tertiary/15 hover:-translate-y-0.5 hover:border-tertiary/35",
                )}
              >
                <span className={cn("text-sm font-medium", isActive ? "text-primary" : "text-tertiary")}>
                  {PLAN_LENGTH_LABELS[length]}
                </span>
                <span className="text-xs text-tertiary/60">₹{plan.prices[length]?.toLocaleString("en-IN")}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <Stepper
        label={isDesk ? "Seats" : "People"}
        hint={
          isDesk
            ? maxSeats > 1
              ? `One desk per person, up to ${maxSeats}. You can name who sits where on the next step.`
              : "This plan covers one desk."
            : "The room you pick must seat everyone."
        }
        value={selection.seats}
        min={1}
        max={maxSeats}
        noun={isDesk ? "seat" : "person"}
        onAdjust={onAdjustSeats}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {hasAddons && (
          <p className="flex items-start gap-2.5 rounded-xl bg-surface px-3.5 py-3 text-xs leading-relaxed text-tertiary/65">
            <PackagePlus aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            Add-ons are not part of the plan price. Buy them for the days you need from My Memberships.
          </p>
        )}
        <p className="flex items-start gap-2.5 rounded-xl bg-surface px-3.5 py-3 text-xs leading-relaxed text-tertiary/65">
          <ReceiptText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          Invoices for a company? Add its billing details at payment.
        </p>
      </div>
    </div>
  );
};

const ConfigureForm = ({
  venue,
  selection,
  plans,
  plan,
  maxSeats,
  onChange,
  onChoosePass,
  onChoosePlan,
  onChooseLength,
  onAdjustSeats,
  onAdjustHours,
}: ConfigureFormProps) => {
  const isDesk = selection.spaceType === "desk";

  const spaceOptions = spaceTypesFor(venue, selection.bookingType).map((value) => ({
    value,
    label: SEAT_TYPE_LABELS[value],
  }));

  const toggleAddOn = (value: string) =>
    onChange(
      "addOns",
      selection.addOns.includes(value)
        ? selection.addOns.filter((item) => item !== value)
        : [...selection.addOns, value],
    );

  const passOptions = PASS_TYPE_OPTIONS.filter((option) => spaceTypesFor(venue, option.value as BookingType).length > 0);

  const addonOptions = venue.addons.map((addon) => ({
    value: addon.key,
    label: `${addon.name} (₹${addon.price.toLocaleString("en-IN")}${ADDON_UNIT_SUFFIX[addon.unit]})`,
  }));

  const isPass = !plan && passOptions.some((option) => option.value === selection.bookingType);

  return (
    <>
      <div className={CARD}>
        {passOptions.length > 0 && (
          <ChipGroup
            label="Pass"
            hint="(one visit)"
            options={passOptions}
            value={isPass ? selection.bookingType : ""}
            onChange={(value) => onChoosePass(value as PassType)}
          />
        )}

        {plans === undefined ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            <div className="h-72 animate-pulse rounded-2xl bg-tertiary/5" />
            <div className="hidden h-72 animate-pulse rounded-2xl bg-tertiary/5 sm:block" />
          </div>
        ) : (
          plans.length > 0 && (
            <section aria-labelledby="venue-plans-title" className="flex flex-col gap-3">
              {passOptions.length > 0 && <div className="border-t border-tertiary/8" />}
              <div>
                <h2 id="venue-plans-title" className="text-sm font-medium text-tertiary">
                  Memberships at this venue
                  <span className="ml-1.5 font-normal text-tertiary/45">(your seat or room kept on the plan&apos;s days)</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((item, index) => (
                  <PlanCard
                    key={item.id}
                    plan={item}
                    compact
                    index={index}
                    isSelected={plan?.id === item.id}
                    onSelect={() => onChoosePlan(item)}
                  />
                ))}
              </div>
            </section>
          )
        )}

        {passOptions.length === 0 && plans?.length === 0 && (
          <p className="text-sm text-tertiary/60">
            {venue.name} has nothing on sale right now. Please check back soon or try another workspace.
          </p>
        )}
      </div>

      {plan ? (
        <PlanDetails
          plan={plan}
          selection={selection}
          maxSeats={maxSeats}
          hasAddons={addonOptions.length > 0}
          onChooseLength={onChooseLength}
          onAdjustSeats={onAdjustSeats}
        />
      ) : (
        isPass && (
          <div className={CARD}>
            <ChipGroup
              label="What are you booking?"
              options={spaceOptions}
              value={selection.spaceType}
              onChange={(value) => onChange("spaceType", value as SeatType)}
            />

            <div className="flex flex-wrap gap-x-12 gap-y-6">
              <Stepper
                label={isDesk ? "Seats required" : "People"}
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

            <ChipGroup
              label="Seating preference"
              options={PREFERENCE_OPTIONS}
              value={selection.preference}
              onChange={(value) => onChange("preference", value)}
            />

            {addonOptions.length > 0 && (
              <ChipGroup
                label="Add ons"
                hint="(optional, pick any)"
                options={addonOptions}
                value={selection.addOns}
                onChange={toggleAddOn}
              />
            )}

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
        )
      )}
    </>
  );
};

export default ConfigureForm;
