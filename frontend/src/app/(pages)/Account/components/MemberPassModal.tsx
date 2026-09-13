"use client";

import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CirclePause, X } from "lucide-react";
import { findVenue } from "@/data/venues";
import type { MemberMembership } from "@/types/membership";
import { formatDay } from "@/utils/date";

type MemberPassModalProps = {
  membership: MemberMembership;
  onClose: () => void;
};

const ROW_LABEL = "text-xs text-tertiary/50";
const ROW_VALUE = "mt-0.5 text-sm font-medium text-tertiary";

/** The QR a member shows at reception instead of a booking ticket. */
const MemberPassModal = ({ membership, onClose }: MemberPassModalProps) => {
  const venue = findVenue(membership.venueSlug);
  const isPaused = membership.status === "paused";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tertiary/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-pass-title"
        className="relative w-full max-w-md rounded-2xl bg-secondary p-6 sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-tertiary/50 transition-colors hover:text-tertiary"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Member pass
          </p>
          <h2
            id="member-pass-title"
            className="mt-1 text-xl font-bold text-tertiary"
          >
            {membership.venueName}
          </h2>
          <p className="mt-0.5 text-sm text-tertiary/60">
            {membership.locality}, {membership.city}
          </p>
        </div>

        <div className="mt-5 flex justify-center rounded-xl bg-tertiary/4 p-5">
          <QRCodeSVG
            value={`growthhub:member:${membership.id}`}
            size={176}
            level="M"
            className={isPaused ? "opacity-30" : undefined}
          />
        </div>

        {isPaused ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
            <CirclePause aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Paused until{" "}
            {membership.resumesOn ? formatDay(membership.resumesOn) : "it resumes"}.
            Resume the plan to check in with this pass.
          </p>
        ) : (
          <p className="mt-3 text-center text-sm text-tertiary/60">
            Scan at reception every day. No booking needed for your seat.
          </p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-tertiary/10 pt-5">
          <div>
            <dt className={ROW_LABEL}>Workspace</dt>
            <dd className={ROW_VALUE}>{membership.workspace}</dd>
          </div>
          <div>
            <dt className={ROW_LABEL}>Your seat</dt>
            <dd className={ROW_VALUE}>{membership.seats.join(", ")}</dd>
          </div>
          <div>
            <dt className={ROW_LABEL}>
              {membership.autoRenew ? "Renews on" : "Valid until"}
            </dt>
            <dd className={ROW_VALUE}>{formatDay(membership.cycleEnd)}</dd>
          </div>
          {venue && (
            <div>
              <dt className={ROW_LABEL}>Access</dt>
              <dd className={ROW_VALUE}>{venue.openHours}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
};

export default MemberPassModal;
