"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import type { Venue } from "@/types/venue";
import { cn } from "@/utils";

const INFO_ROW =
  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-tertiary/3";
const INFO_ICON =
  "flex size-8 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-tertiary/70";

const BookingRail = ({ venue }: { venue: Venue }) => {
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [areHoursOpen, setAreHoursOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-tertiary/10 bg-secondary">
        {venue.offer && (
          <>
            <button
              type="button"
              onClick={() => setIsOfferOpen((open) => !open)}
              aria-expanded={isOfferOpen}
              className="flex w-full items-center justify-between gap-2 bg-offer px-4 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-tertiary">
                <Image
                  src="/assets/workspace/coupon.png"
                  alt=""
                  width={18}
                  height={18}
                  className="size-4.5 shrink-0"
                />
                {venue.offer.label}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 text-tertiary/70 transition-transform duration-200",
                  isOfferOpen && "rotate-180",
                )}
              />
            </button>
            {isOfferOpen && (
              <p className="border-b border-tertiary/8 px-4 py-3 text-xs leading-relaxed text-tertiary/65">
                {venue.offer.details}
              </p>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div>
            <p className="text-xs text-tertiary/55">Starting From</p>
            <p className="text-lg font-bold text-tertiary">
              ₹{venue.dayPassPrice} Per Day
            </p>
          </div>
          <Link
            href={`/workspaces/${venue.slug}/book`}
            className="cta-gradient shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            Book Now
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-tertiary/10 bg-secondary">
        <a
          href={venue.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={INFO_ROW}
        >
          <span className={INFO_ICON}>
            <MapPin aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 grow">
            <span className="block truncate text-sm font-medium text-tertiary">
              {venue.locality}, {venue.city}
            </span>
            <span className="block text-xs text-tertiary/55">
              {venue.distanceKm}km Away
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-tertiary/40"
          />
        </a>

        <div className="mx-4 border-t border-tertiary/8" />

        <button
          type="button"
          onClick={() => setAreHoursOpen((open) => !open)}
          aria-expanded={areHoursOpen}
          className={INFO_ROW}
        >
          <span className={INFO_ICON}>
            <CalendarDays aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 grow">
            <span className="block text-sm font-medium text-tertiary">
              {venue.openDaysLabel}
            </span>
            <span className="block text-xs text-tertiary/55">
              {venue.openHours}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-tertiary/40 transition-transform duration-200",
              areHoursOpen && "rotate-90",
            )}
          />
        </button>

        {areHoursOpen && (
          <p className="border-t border-tertiary/8 px-4 py-3 text-xs leading-relaxed text-tertiary/65">
            {venue.hoursNote}
          </p>
        )}
      </div>
    </div>
  );
};

export default BookingRail;
