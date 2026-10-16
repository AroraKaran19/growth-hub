"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, Wrench } from "lucide-react";
import { useAdminVenue, useAdminVenues } from "@/hooks/useAdminCatalogue";
import { readApiError } from "@/libs/api/errors";
import { SEAT_TYPE_LABELS } from "@/types/seat";
import { currentOutage, outageEndLabel } from "@/utils/outages";
import {
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import OutageDialog from "./components/availability/OutageDialog";
import { QUIET, RAISED } from "./components/venue/fields";
import VenuePicker from "./components/VenuePicker";
import SeatPlan from "./components/venue/SeatPlan";

const TICK_MS = 30_000;

/** The current time, refreshed so outages that run out drop off without a reload. */
const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
};

const AdminAvailabilityPage = () => {
  const searchParams = useSearchParams();
  const { venues, error: listError, isLoading: isListLoading } = useAdminVenues();
  const [chosen, setChosen] = useState(searchParams.get("venue") ?? "");
  const venueSlug = venues.some((item) => item.slug === chosen) ? chosen : (venues[0]?.slug ?? null);

  const { venue, error: venueError, isLoading, takeSeatOut, endOutage } = useAdminVenue(venueSlug);
  const now = useNow();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isListLoading) return <Skeleton />;

  const seats = venue?.seatMap?.seats ?? [];
  const outageOf = (seatId: string) => currentOutage(venue?.outages, seatId, now);
  const outOfService = seats.flatMap((seat) => {
    const outage = outageOf(seat.id);
    return outage ? [{ seat, outage }] : [];
  });
  const selected = seats.find((seat) => seat.id === selectedId) ?? null;

  const pickVenue = (slug: string) => {
    setChosen(slug);
    setSelectedId(null);
    setError(null);
  };

  const bringBack = async (seatId: string) => {
    setEndingId(seatId);
    setError(null);
    try {
      await endOutage(seatId);
    } catch (caught) {
      setError(readApiError(caught).message);
    } finally {
      setEndingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Availability"
        description="Take seats and rooms out of service for a few hours, a few days, or until you bring them back. Members can't book them while they're out, and partners see them as blocked."
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
                  Bookable now {seats.length - outOfService.length}
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
            <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className={`${RAISED} p-4 sm:p-5`}>
                <p className="mb-3 text-sm text-tertiary/60">
                  Select a seat or room to take it out of service, or to bring it back.
                </p>
                <SeatPlan
                  image={venue.seatMap.image}
                  seats={seats}
                  isOff={(seat) => Boolean(outageOf(seat.id))}
                  onSelect={(seat) => {
                    setError(null);
                    setSelectedId(seat.id);
                  }}
                />
              </div>

              <aside className={`${RAISED} h-fit p-5`}>
                <h2 className="text-base font-bold text-tertiary">Out of service</h2>
                {outOfService.length === 0 ? (
                  <p className="mt-3 text-sm text-tertiary/60">Everything at {venue.name} is bookable.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {outOfService.map(({ seat, outage }, index) => (
                      <li
                        key={seat.id}
                        style={{ animationDelay: `${index * 40}ms` }}
                        className="flex animate-[fade-up_0.25s_ease-out_both] items-center gap-3 rounded-xl bg-tertiary/4 p-3 ring-1 ring-tertiary/6 motion-reduce:animate-none"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-tertiary/60 shadow-sm">
                          <Wrench aria-hidden="true" className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-tertiary">
                            {seat.label}
                            <span className="ml-1.5 font-normal text-tertiary/50">{SEAT_TYPE_LABELS[seat.type]}</span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-tertiary/60">
                            <Clock aria-hidden="true" className="size-3 shrink-0" />
                            {outageEndLabel(outage.endsAt)}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={endingId !== null}
                          onClick={() => void bringBack(seat.id)}
                          className={`${QUIET} shrink-0 text-primary`}
                        >
                          {endingId === seat.id ? "Saving…" : "Back in service"}
                          <span className="sr-only"> {seat.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {error && (
                  <p role="alert" className="mt-3 text-sm text-primary">
                    {error}
                  </p>
                )}
                <p className="mt-4 text-xs text-tertiary/50">
                  A seat can&apos;t go out while a booking, membership or walk-in needs it in that time. Move or cancel
                  those first.
                </p>
              </aside>
            </div>
          )}
        </>
      )}

      {venue && selected && (
        <OutageDialog
          key={selected.id}
          seat={selected}
          outage={outageOf(selected.id)}
          now={now}
          onTakeOut={(duration) => takeSeatOut(selected.id, duration)}
          onEnd={() => endOutage(selected.id)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
};

export default AdminAvailabilityPage;
