"use client";

import { useState } from "react";
import { fetchSeatMap, useSeatMaps } from "@/hooks/useAdminCatalogue";
import { readApiError } from "@/libs/api/errors";
import type { AdminVenue, ApiSeat, SeatMapDetail, SeatMapSummary } from "@/types/catalogue";
import { SEAT_TYPE_LABELS, type SeatType } from "@/types/seat";
import { cn } from "@/utils";
import { QUIET, Section } from "./fields";
import SeatPlan from "./SeatPlan";

const CONTACT = process.env.NEXT_PUBLIC_DEVELOPER_CONTACT_EMAIL;

const ERROR_COPY: Record<string, string> = {
  MAP_TAKEN: "Another venue just took this map. Pick a different one.",
  VENUE_HAS_MAP: "This venue already has a seat map. Reload to see it.",
  VENUE_PUBLISHED: "Hide the venue before removing its map.",
  SEAT_MAP_NOT_FOUND: "That seat map no longer exists.",
};

const countsOf = (seats: ApiSeat[]) => {
  const counts = {} as Record<SeatType, number>;
  for (const seat of seats) counts[seat.type] = (counts[seat.type] ?? 0) + 1;
  return counts;
};

export const SeatCounts = ({ counts }: { counts: Partial<Record<SeatType, number>> }) => (
  <ul className="flex flex-wrap gap-1.5">
    {(Object.keys(SEAT_TYPE_LABELS) as SeatType[])
      .filter((type) => counts[type])
      .map((type) => (
        <li key={type} className="rounded-full bg-tertiary/5 px-2.5 py-0.5 text-xs text-tertiary/75">
          {counts[type]} {SEAT_TYPE_LABELS[type].toLowerCase()}
        </li>
      ))}
  </ul>
);

export const ContactDeveloper = () => (
  <p className="text-sm text-tertiary/60">
    Need a new map?{" "}
    {CONTACT ? (
      <a href={`mailto:${CONTACT}?subject=New%20seat%20map`} className="font-medium text-primary hover:opacity-75">
        Contact the developer
      </a>
    ) : (
      <span className="font-medium text-tertiary">Contact the developer</span>
    )}
    . Maps are drawn and added for you.
  </p>
);

type SeatMapCardProps = {
  venue: AdminVenue;
  onAssign: (seatMapId: string) => Promise<AdminVenue>;
  onUnassign: () => Promise<AdminVenue>;
  /** Tells the form its base version moved because of our own change. */
  onVersion: (version: number) => void;
};

const SeatMapCard = ({ venue, onAssign, onUnassign, onVersion }: SeatMapCardProps) => {
  const { seatMaps, isLoading, refresh } = useSeatMaps("free");
  const [picked, setPicked] = useState<SeatMapSummary | null>(null);
  const [preview, setPreview] = useState<SeatMapDetail | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<AdminVenue>) => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await action();
      onVersion(updated.version);
      setPicked(null);
      setPreview(null);
      setIsConfirming(false);
    } catch (caught) {
      const info = readApiError(caught);
      setError((info.code && ERROR_COPY[info.code]) ?? info.message);
    } finally {
      await refresh();
      setIsSaving(false);
    }
  };

  const pick = async (seatMap: SeatMapSummary) => {
    setPicked(seatMap);
    setPreview(null);
    setError(null);
    try {
      setPreview(await fetchSeatMap(seatMap.id));
    } catch (caught) {
      setError(readApiError(caught).message);
    }
  };

  const current = venue.seatMap;

  return (
    <Section
      title="Seat map"
      hint="Each venue has one map, and a map belongs to one venue until it is unassigned."
    >
      {current ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-tertiary">{current.name}</p>
              <div className="mt-1.5">
                <SeatCounts counts={countsOf(current.seats)} />
              </div>
            </div>
            {!isConfirming && (
              <button
                type="button"
                disabled={venue.published}
                onClick={() => setIsConfirming(true)}
                className={cn(QUIET, "text-primary")}
              >
                Unassign
              </button>
            )}
          </div>
          {venue.published && (
            <p className="mt-2 text-xs text-tertiary/55">Hide the venue first to change its map.</p>
          )}
          {isConfirming && (
            <div role="alert" className="mt-3 rounded-xl bg-primary/5 p-3.5 text-sm text-tertiary">
              Remove this map from {venue.name}? Seats marked out of service are cleared, and the map
              becomes free for another venue.
              <div className="mt-3 flex items-center gap-4">
                <button type="button" disabled={isSaving} onClick={() => run(onUnassign)} className={cn(QUIET, "text-primary")}>
                  {isSaving ? "Removing..." : "Yes, unassign"}
                </button>
                <button type="button" onClick={() => setIsConfirming(false)} className={cn(QUIET, "text-tertiary/60")}>
                  Keep it
                </button>
              </div>
            </div>
          )}
          <SeatPlan
            image={current.image}
            seats={current.seats}
            isOff={(seat) => venue.outOfServiceSeatIds.includes(seat.id)}
            className="mt-4"
          />
        </>
      ) : isLoading ? (
        <p className="text-sm text-tertiary/55">Loading free maps...</p>
      ) : seatMaps.length === 0 ? (
        <p className="rounded-xl border border-dashed border-tertiary/15 p-5 text-center text-sm text-tertiary/60">
          No free maps in the library right now.
        </p>
      ) : (
        <>
          <p className="text-sm text-tertiary/70">Pick one of the free maps for this venue.</p>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {seatMaps.map((seatMap) => {
              const isPicked = picked?.id === seatMap.id;
              return (
                <li key={seatMap.id}>
                  <button
                    type="button"
                    aria-pressed={isPicked}
                    onClick={() => pick(seatMap)}
                    className={cn(
                      "w-full rounded-xl border p-3.5 text-left transition-all",
                      isPicked
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-tertiary/12 hover:-translate-y-0.5 hover:border-tertiary/25 hover:shadow-sm",
                    )}
                  >
                    <span className="block text-sm font-medium text-tertiary">{seatMap.name}</span>
                    <span className="mt-1.5 block">
                      <SeatCounts counts={seatMap.countsByType} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {picked && (
            <div className="mt-4">
              {preview ? (
                <SeatPlan image={preview.image} seats={preview.seats} />
              ) : (
                <div className="h-48 animate-pulse rounded-xl bg-tertiary/5" aria-label="Loading preview" />
              )}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => run(() => onAssign(picked.id))}
                className="cta-gradient mt-4 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Assigning..." : `Assign ${picked.name}`}
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-primary">
          {error}
        </p>
      )}
      <div className="mt-5 border-t border-tertiary/8 pt-4">
        <ContactDeveloper />
      </div>
    </Section>
  );
};

export default SeatMapCard;
