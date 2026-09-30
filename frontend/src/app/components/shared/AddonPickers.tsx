"use client";

import { Check } from "lucide-react";
import { ORDER_UNIT_SUFFIX } from "@/app/(pages)/Account/addonOrderRules";
import { rupees } from "@/app/(pages)/Booking/checkoutState";
import type { VenueAddonOffer } from "@/types/catalogue";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const toggled = (list: string[], item: string) =>
  list.includes(item) ? list.filter((value) => value !== item) : [...list, item];

type DayChipsProps = { days: string[]; picked: string[]; onToggle: (iso: string) => void };

/** A scrollable strip of day chips; several can be on. */
export const DayChips = ({ days, picked, onToggle }: DayChipsProps) => (
  <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2">
    {days.map((iso) => {
      const date = new Date(`${iso}T00:00:00`);
      const isOn = picked.includes(iso);
      return (
        <button
          key={iso}
          type="button"
          aria-pressed={isOn}
          aria-label={formatDay(iso)}
          onClick={() => onToggle(iso)}
          className={cn(
            "flex w-14 shrink-0 flex-col items-center rounded-xl border py-2 transition-all",
            isOn
              ? "border-primary bg-primary text-secondary shadow-md shadow-primary/25"
              : "border-tertiary/12 bg-surface text-tertiary hover:-translate-y-0.5 hover:border-tertiary/30",
          )}
        >
          <span className={cn("text-[11px]", isOn ? "text-secondary/80" : "text-tertiary/55")}>
            {WEEKDAYS[date.getDay()]}
          </span>
          <span className="text-lg font-bold leading-tight">{date.getDate()}</span>
          <span className={cn("text-[11px]", isOn ? "text-secondary/80" : "text-tertiary/55")}>
            {MONTHS[date.getMonth()]}
          </span>
        </button>
      );
    })}
  </div>
);

type AddonTilesProps = { offers: VenueAddonOffer[]; picked: string[]; onToggle: (key: string) => void };

/** Add-on offers as tiles with a tick; several can be on. */
export const AddonTiles = ({ offers, picked, onToggle }: AddonTilesProps) => (
  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
    {offers.map((offer) => {
      const isOn = picked.includes(offer.key);
      return (
        <button
          key={offer.key}
          type="button"
          aria-pressed={isOn}
          onClick={() => onToggle(offer.key)}
          className={cn(
            "relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
            isOn
              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
              : "border-tertiary/12 bg-secondary shadow-sm hover:-translate-y-0.5 hover:shadow-md",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
              isOn ? "border-primary bg-primary text-secondary" : "border-tertiary/25",
            )}
          >
            {isOn && <Check className="size-3.5" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-tertiary">{offer.name}</span>
            {offer.description && <span className="mt-0.5 block text-xs text-tertiary/60">{offer.description}</span>}
            <span className="mt-2 block text-sm text-tertiary">
              {rupees(Math.round(offer.price * 100))}
              <span className="text-xs text-tertiary/55">{ORDER_UNIT_SUFFIX[offer.unit]}</span>
            </span>
          </span>
        </button>
      );
    })}
  </div>
);
