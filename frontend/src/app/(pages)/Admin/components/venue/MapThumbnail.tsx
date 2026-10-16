"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import type { ApiSeat } from "@/types/catalogue";
import { cn } from "@/utils";
import SeatPlan from "./SeatPlan";

type MapThumbnailProps = {
  image: string;
  seats: ApiSeat[];
  title: string;
  isOff?: (seat: ApiSeat) => boolean;
  className?: string;
};

/** A small preview of a floor plan that opens the full map in a popup. */
const MapThumbnail = ({ image, seats, title, isOff, className }: MapThumbnailProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`View ${title} full size`}
        className={cn(
          "group relative block w-full max-w-60 overflow-hidden rounded-xl text-left shadow-md shadow-tertiary/8 transition-all hover:-translate-y-0.5 hover:shadow-lg",
          className,
        )}
      >
        <SeatPlan image={image} seats={seats} isOff={isOff} />
        <span className="absolute inset-0 flex items-end justify-end bg-linear-to-t from-tertiary/55 via-transparent to-transparent p-2 opacity-90 transition-opacity group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-tertiary shadow-sm">
            <Maximize2 aria-hidden="true" className="size-3.5" />
            Full map
          </span>
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tertiary/60 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-4xl animate-[fade-up_0.2s_ease-out_both] rounded-2xl bg-secondary p-4 shadow-2xl motion-reduce:animate-none sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-base font-bold text-tertiary">{title}</p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-tertiary/50 transition-colors hover:text-tertiary"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <SeatPlan image={image} seats={seats} isOff={isOff} />
          </div>
        </div>
      )}
    </>
  );
};

export default MapThumbnail;
