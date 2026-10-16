"use client";

import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CircleAlert, X } from "lucide-react";
import { useVenue } from "@/hooks/useVenues";
import type { ApiMembership } from "@/types/membership";
import { formatDay } from "@/utils/date";
import { daysLabel, membershipTitle, seatNoun, windowLabel } from "@/utils/plans";
import { hoursOnDays } from "@/utils/venueHours";

type MemberPassModalProps = {
  membership: ApiMembership;
  onClose: () => void;
};

const ROW_LABEL = "text-xs text-tertiary/50";
const ROW_VALUE = "mt-0.5 text-sm font-medium text-tertiary";

/** The QR a member shows at reception instead of a booking ticket. */
const MemberPassModal = ({ membership, onClose }: MemberPassModalProps) => {
  const { venue } = useVenue(membership.venue.slug);
  const isPastDue = membership.status === "past-due";

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
          <p className="text-xs font-semibold text-primary">Member pass</p>
          <h2 id="member-pass-title" className="mt-1 text-xl font-bold text-tertiary">
            {membership.venue.name}
          </h2>
          <p className="mt-0.5 text-sm text-tertiary/60">
            {membership.venue.locality}, {membership.venue.city}
          </p>
        </div>

        {membership.memberPass ? (
          <div className="mt-5 flex justify-center rounded-xl bg-tertiary/4 p-5">
            <QRCodeSVG value={membership.memberPass} size={176} level="M" />
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-tertiary/4 p-5 text-center text-sm text-tertiary/65">
            Give reception your membership ID, {membership.ref}.
          </p>
        )}

        {isPastDue ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Your last renewal payment failed. Update your payment method in Razorpay to keep your seat.
          </p>
        ) : (
          <p className="mt-3 text-center text-sm text-tertiary/60">
            Scan at reception every day. No booking needed for your seat.
          </p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-tertiary/10 pt-5">
          <div>
            <dt className={ROW_LABEL}>Plan</dt>
            <dd className={ROW_VALUE}>{membershipTitle(membership)}</dd>
          </div>
          <div>
            <dt className={ROW_LABEL}>{seatNoun(membership.spaceType, membership.seats.length)}</dt>
            <dd className={ROW_VALUE}>{membership.seats.map((seat) => seat.label).join(", ")}</dd>
          </div>
          <div>
            <dt className={ROW_LABEL}>Days</dt>
            <dd className={ROW_VALUE}>{daysLabel(membership.plan?.days)}</dd>
          </div>
          {membership.paidThrough && (
            <div>
              <dt className={ROW_LABEL}>{membership.renewsOn ? "Paid through" : "Valid until"}</dt>
              <dd className={ROW_VALUE}>{formatDay(membership.paidThrough)}</dd>
            </div>
          )}
          {(membership.window || venue) && (
            <div>
              <dt className={ROW_LABEL}>{membership.window ? "Your window" : "Access"}</dt>
              <dd className={ROW_VALUE}>
                {membership.window ? windowLabel(membership.window) : venue && hoursOnDays(venue.hours, membership.plan?.days)}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
};

export default MemberPassModal;
