"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Crown,
  MapPin,
} from "lucide-react";
import { StaffBookingNote, useIsStaff } from "@/app/components/shared/CustomerOnly";
import { useVenueMembership } from "@/hooks/useMemberships";
import { useVenuePlans } from "@/hooks/useVenuePlans";
import type { Venue } from "@/types/venue";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import { membershipTitle, windowLabel } from "@/utils/plans";
import { startingFrom } from "@/utils/venues";

const INFO_ROW =
  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-tertiary/3";
const INFO_ICON =
  "flex size-8 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-tertiary/70";

const BookingRail = ({ venue }: { venue: Venue }) => {
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [areHoursOpen, setAreHoursOpen] = useState(false);
  const membership = useVenueMembership(venue.slug);
  const isBookable = venue.published;
  const isStaff = useIsStaff();
  const { plans } = useVenuePlans(venue.slug);
  const monthly = (plans ?? []).map((plan) => plan.prices.monthly).filter((price): price is number => price !== null);
  const monthlyFrom = monthly.length ? Math.min(...monthly) : null;
  const from = startingFrom(venue);

  const location = (
    <>
      <span className={INFO_ICON}>
        <MapPin aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 grow">
        <span className="block truncate text-sm font-medium text-tertiary">
          {venue.locality}, {venue.city}
        </span>
        {venue.distanceKm > 0 && (
          <span className="block text-xs text-tertiary/55">
            {venue.distanceKm}km Away
          </span>
        )}
      </span>
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-tertiary/10 bg-secondary">
        {venue.offer && isBookable && (
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

        {isBookable ? (
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div>
              <p className="text-xs text-tertiary/55">Starting from</p>
              <p className="text-lg font-bold text-tertiary">
                {from ? `₹${from.amount.toLocaleString("en-IN")} per ${from.unit}` : "See prices"}
              </p>
            </div>
            {!isStaff && (
              <Link
                href={`/workspaces/${venue.slug}/book`}
                className="cta-gradient shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
              >
                Book Now
              </Link>
            )}
          </div>
        ) : (
          <div className="px-4 py-3.5">
            <p className="text-sm font-semibold text-tertiary">
              Not taking bookings right now
            </p>
            <p className="mt-0.5 text-xs text-tertiary/60">
              Existing bookings and memberships here are not affected.
            </p>
            <Link
              href="/workspaces"
              className="mt-2 inline-block text-sm font-medium text-primary"
            >
              Browse other workspaces
            </Link>
          </div>
        )}

        {membership ? (
          <div className="border-t border-tertiary/8 bg-primary/5 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium text-tertiary">
              <Crown aria-hidden="true" className="size-4 text-primary" />
              {membership.status === "past-due"
                ? "Your renewal payment failed"
                : "You're a member here"}
            </p>
            <p className="mt-0.5 text-xs text-tertiary/60">
              {membershipTitle(membership)}: {membership.seats.map((seat) => seat.label).join(", ")} is kept for you
              {membership.window ? `, ${windowLabel(membership.window)}` : ""}
              {membership.paidThrough ? ` until ${formatDay(membership.paidThrough)}` : ""}.
            </p>
            <Link
              href="/account/memberships"
              className="mt-1.5 inline-block text-xs font-medium text-primary transition-opacity hover:opacity-75"
            >
              Manage membership
            </Link>
          </div>
        ) : isStaff ? (
          <StaffBookingNote className="border-t border-tertiary/8 px-4 py-3 text-xs" />
        ) : (
          isBookable &&
          Boolean(plans?.length) && (
            <a
              href="#memberships"
              className="flex items-center justify-between gap-3 border-t border-tertiary/8 px-4 py-3 transition-colors hover:bg-tertiary/3"
            >
              <span>
                <span className="block text-sm font-medium text-tertiary">
                  Work here most days?
                </span>
                <span className="text-xs text-tertiary/55">
                  {monthlyFrom !== null
                    ? `Membership plans from ₹${monthlyFrom.toLocaleString("en-IN")}/month`
                    : `See ${plans?.length} membership plan${plans?.length === 1 ? "" : "s"}`}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-tertiary/40"
              />
            </a>
          )
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-tertiary/10 bg-secondary">
        {venue.googleMapsUrl ? (
          <a
            href={venue.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={INFO_ROW}
          >
            {location}
            <ChevronRight
              aria-hidden="true"
              className="size-4 shrink-0 text-tertiary/40"
            />
          </a>
        ) : (
          <div className={INFO_ROW}>{location}</div>
        )}

        <div className="mx-4 border-t border-tertiary/8" />

        <button
          type="button"
          onClick={() => setAreHoursOpen((open) => !open)}
          aria-expanded={areHoursOpen}
          disabled={!venue.hoursNote}
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
          {venue.hoursNote && (
            <ChevronRight
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 text-tertiary/40 transition-transform duration-200",
                areHoursOpen && "rotate-90",
              )}
            />
          )}
        </button>

        {areHoursOpen && venue.hoursNote && (
          <p className="border-t border-tertiary/8 px-4 py-3 text-xs leading-relaxed text-tertiary/65">
            {venue.hoursNote}
          </p>
        )}
      </div>
    </div>
  );
};

export default BookingRail;
