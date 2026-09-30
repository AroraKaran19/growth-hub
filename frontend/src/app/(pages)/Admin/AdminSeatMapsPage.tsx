"use client";

import Link from "next/link";
import { useSeatMaps } from "@/hooks/useAdminCatalogue";
import { cn } from "@/utils";
import {
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import { RAISED } from "./components/venue/fields";
import { ContactDeveloper, SeatCounts } from "./components/venue/SeatMapCard";

const AdminSeatMapsPage = () => {
  const { seatMaps, error, isLoading } = useSeatMaps("all");
  const free = seatMaps.filter((seatMap) => !seatMap.venue).length;

  return (
    <>
      <PageHeader
        title="Seat maps"
        description="The library of floor plans. Each map belongs to one venue at a time; assign and unassign them from a venue's page."
      />

      <div className={cn(RAISED, "mt-6 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5")}>
        <ContactDeveloper />
        {!isLoading && !error && (
          <p className="text-sm text-tertiary/60">
            {seatMaps.length} maps, {free} free
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="mt-5">
          <Skeleton />
        </div>
      ) : error ? (
        <p role="alert" className="mt-5 text-sm text-primary">
          We couldn&apos;t load the seat maps. Refresh to try again.
        </p>
      ) : seatMaps.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-tertiary/15 p-8 text-center text-sm text-tertiary/55">
          No seat maps in the library yet.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {seatMaps.map((seatMap) => (
            <li key={seatMap.id} className={cn(RAISED, "overflow-hidden transition-shadow hover:shadow-xl")}>
              <div className="border-b border-tertiary/8 bg-tertiary/3">
                {/* Plain img: plans keep their own aspect ratio. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={seatMap.image} alt="" className="aspect-16/10 w-full object-contain" />
              </div>
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-tertiary">{seatMap.name}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      seatMap.venue ? "bg-tertiary/8 text-tertiary/70" : "bg-green-500/12 text-green-700",
                    )}
                  >
                    {seatMap.venue ? "Assigned" : "Free"}
                  </span>
                </div>
                <div className="mt-2.5">
                  <SeatCounts counts={seatMap.countsByType} />
                </div>
                <p className="mt-3 border-t border-tertiary/8 pt-3 text-sm text-tertiary/60">
                  {seatMap.venue ? (
                    <>
                      Used by{" "}
                      <Link
                        href={`/admin/venues/${seatMap.venue.slug}`}
                        className="font-medium text-primary hover:opacity-75"
                      >
                        {seatMap.venue.name}
                      </Link>
                    </>
                  ) : (
                    "Ready to assign from a venue's page."
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default AdminSeatMapsPage;
