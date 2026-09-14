"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import SelectField from "@/app/components/ui/form/SelectField";
import { DEMO_FLOOR_PLAN } from "@/data/floorPlan";
import { useVenueCatalog } from "@/stores/venues";
import { SEAT_TYPE_LABELS } from "@/types/seat";
import { cn } from "@/utils";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";

const AdminAvailabilityPage = () => {
  const catalog = useVenueCatalog();
  const searchParams = useSearchParams();
  const requested = searchParams.get("venue");
  const [venueSlug, setVenueSlug] = useState(
    () =>
      catalog.venues.find((venue) => venue.slug === requested)?.slug ??
      catalog.venues[0].slug,
  );

  if (!catalog.isHydrated) return <Skeleton />;

  const venue = catalog.venues.find((item) => item.slug === venueSlug) ?? catalog.venues[0];
  const seats = catalog.seatsFor(venue.slug);
  const outOfService = seats.filter((seat) => !seat.available);

  return (
    <>
      <PageHeader
        title="Availability"
        description="Take seats and rooms out of service, for maintenance or private use. Members can't book them and partners see them as blocked."
      />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <SelectField
          label="Venue"
          value={venue.slug}
          onChange={setVenueSlug}
          options={catalog.venues.map((item) => ({
            value: item.slug,
            label: `${item.name}, ${item.locality}`,
          }))}
          className="w-80 max-w-full"
        />
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-tertiary/70">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-green-500" />
            Bookable {seats.length - outOfService.length}
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-tertiary/35" />
            Out of service {outOfService.length}
          </li>
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={`${CARD} p-4 sm:p-5`}>
          <p className="mb-3 text-sm text-tertiary/60">
            Select a seat or room to switch it between bookable and out of service.
          </p>
          <div className="relative overflow-hidden rounded-xl border border-tertiary/10">
            {/* Plain img so the plan and its seat boxes share one coordinate
                space; percentages position every seat against it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEMO_FLOOR_PLAN.image} alt="Floor plan" className="w-full select-none" draggable={false} />
            {seats.map((seat) => (
              <button
                key={seat.id}
                type="button"
                role="switch"
                aria-checked={seat.available}
                onClick={() => catalog.setSeatAvailable(venue.slug, seat.id, !seat.available)}
                title={`${seat.label}: ${seat.available ? "bookable" : "out of service"}`}
                style={{
                  left: `${seat.x}%`,
                  top: `${seat.y}%`,
                  width: `${seat.width}%`,
                  height: `${seat.height}%`,
                }}
                className={cn(
                  "absolute rounded border-2 transition-colors",
                  seat.available
                    ? "border-green-600 bg-green-500/35 hover:bg-green-500/55"
                    : "border-tertiary/40 bg-tertiary/35 hover:bg-tertiary/45",
                )}
              >
                <span className="sr-only">
                  {seat.label} {seat.available ? "bookable" : "out of service"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className={`${CARD} h-fit p-5`}>
          <h2 className="text-base font-bold text-tertiary">Out of service</h2>
          {outOfService.length === 0 ? (
            <p className="mt-3 text-sm text-tertiary/60">Everything at {venue.name} is bookable.</p>
          ) : (
            <ul className="mt-3 divide-y divide-tertiary/8">
              {outOfService.map((seat) => (
                <li key={seat.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm text-tertiary">
                    {seat.label}
                    <span className="block text-xs text-tertiary/50">{SEAT_TYPE_LABELS[seat.type]}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => catalog.setSeatAvailable(venue.slug, seat.id, true)}
                    className="text-sm font-medium text-primary transition-opacity hover:opacity-75"
                  >
                    Restore
                    <span className="sr-only"> {seat.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => catalog.resetSeats(venue.slug)}
            className="mt-4 w-full rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
          >
            Reset to the venue&apos;s defaults
          </button>
          <p className="mt-3 text-xs text-tertiary/50">
            Bookings already made for a seat stay valid. Contact the member if
            they need to move.
          </p>
        </aside>
      </div>
    </>
  );
};

export default AdminAvailabilityPage;
