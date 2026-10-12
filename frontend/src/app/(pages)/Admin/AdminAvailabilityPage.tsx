"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAdminVenue, useAdminVenues } from "@/hooks/useAdminCatalogue";
import { readApiError } from "@/libs/api/errors";
import type { ApiSeat } from "@/types/catalogue";
import { SEAT_TYPE_LABELS } from "@/types/seat";
import {
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import { QUIET, RAISED } from "./components/venue/fields";
import VenuePicker from "./components/VenuePicker";
import SeatPlan from "./components/venue/SeatPlan";

const AdminAvailabilityPage = () => {
  const searchParams = useSearchParams();
  const { venues, error: listError, isLoading: isListLoading } = useAdminVenues();
  const [chosen, setChosen] = useState(searchParams.get("venue") ?? "");
  const venueSlug = venues.some((item) => item.slug === chosen) ? chosen : (venues[0]?.slug ?? null);

  const { venue, error: venueError, isLoading, setOutOfService } = useAdminVenue(venueSlug);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // State lags a key press; the ref stops a second save built from the old list.
  const saving = useRef(false);

  if (isListLoading) return <Skeleton />;

  const seats = venue?.seatMap?.seats ?? [];
  const off = new Set(venue?.outOfServiceSeatIds ?? []);
  const outOfService = seats.filter((seat) => off.has(seat.id));

  const pickVenue = (slug: string) => {
    setChosen(slug);
    setError(null);
  };

  const save = async (seatIds: string[]) => {
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    setError(null);
    try {
      await setOutOfService(seatIds);
    } catch (caught) {
      setError(readApiError(caught).message);
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  const toggle = (seat: ApiSeat) =>
    save(off.has(seat.id) ? [...off].filter((id) => id !== seat.id) : [...off, seat.id]);

  return (
    <>
      <PageHeader
        title="Availability"
        description="Take seats and rooms out of service, for maintenance or private use. Members can't book them and partners see them as blocked."
      />

      {listError ? (
        <p role="alert" className="mt-6 text-sm text-primary">
          We couldn&apos;t load the venues. Refresh to try again.
        </p>
      ) : venues.length === 0 ? (
        <p className="mt-6 text-sm text-tertiary/60">No venues yet.</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <VenuePicker label="Venue" value={venueSlug ?? ""} onChange={(slug) => pickVenue(slug)} className="w-80 max-w-full" />
            {venue?.seatMap && (
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
            )}
          </div>

          {venueError && !venue ? (
            <p role="alert" className="mt-5 text-sm text-primary">
              We couldn&apos;t load this venue. Refresh to try again.
            </p>
          ) : isLoading || !venue ? (
            <div className="mt-5">
              <Skeleton />
            </div>
          ) : !venue.seatMap ? (
            <div className={`${RAISED} mt-5 p-8 text-center`}>
              <p className="font-semibold text-tertiary">{venue.name} has no seat map yet</p>
              <p className="mt-1.5 text-sm text-tertiary/60">Assign a seat map first, then manage its seats here.</p>
              <Link
                href={`/admin/venues/${venue.slug}`}
                className="cta-gradient mt-4 inline-flex rounded-lg px-4 py-2.5 text-sm font-medium text-secondary"
              >
                Open the venue
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className={`${RAISED} p-4 sm:p-5`}>
                <p className="mb-3 text-sm text-tertiary/60">
                  Select a seat or room to switch it between bookable and out of service.
                </p>
                <div className={isSaving ? "pointer-events-none opacity-70" : undefined}>
                  <SeatPlan
                    image={venue.seatMap.image}
                    seats={seats}
                    isOff={(seat) => off.has(seat.id)}
                    onToggle={toggle}
                  />
                </div>
                {error && (
                  <p role="alert" className="mt-3 text-sm text-primary">
                    {error}
                  </p>
                )}
              </div>

              <aside className={`${RAISED} h-fit p-5`}>
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
                        <button type="button" disabled={isSaving} onClick={() => toggle(seat)} className={`${QUIET} text-primary`}>
                          Restore
                          <span className="sr-only"> {seat.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {outOfService.length > 0 && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => save([])}
                    className="mt-4 w-full rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5 disabled:opacity-50"
                  >
                    Restore all
                  </button>
                )}
                <p className="mt-3 text-xs text-tertiary/50">
                  Bookings already made for a seat stay valid. Contact the member if they need to
                  move.
                </p>
              </aside>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default AdminAvailabilityPage;
