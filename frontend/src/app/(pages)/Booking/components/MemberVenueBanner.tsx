"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CirclePause, Crown, QrCode } from "lucide-react";
import type { MemberMembership } from "@/types/membership";
import { formatDay } from "@/utils/date";
import MemberPassModal from "../../Account/components/MemberPassModal";

/** Tells a member their seat is already theirs before they book anything. */
const MemberVenueBanner = ({ membership }: { membership: MemberMembership }) => {
  const [showPass, setShowPass] = useState(false);
  const seatLabel = membership.seats.join(", ");

  if (membership.status === "paused") {
    return (
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-5">
        <p className="flex max-w-2xl items-start gap-3 text-sm text-amber-900">
          <CirclePause aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>
            <span className="block text-base font-semibold">
              Your membership here is paused
            </span>
            Your {membership.workspace.toLowerCase()} {seatLabel} stays held
            until{" "}
            {membership.resumesOn ? formatDay(membership.resumesOn) : "it resumes"}.
            Resume the plan to use your seat and included hours, or book as a
            guest below.
          </span>
        </p>
        <Link
          href="/account/memberships"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 underline underline-offset-4"
        >
          Resume in My Memberships
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    );
  }

  const hoursLeft = Math.max(
    membership.meetingRoomHours.included - membership.meetingRoomHours.used,
    0,
  );
  const passesLeft = Math.max(
    membership.guestPasses.included - membership.guestPasses.used,
    0,
  );

  return (
    <div className="feature-card rounded-2xl border border-primary/25 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl items-start gap-3">
          <span className="bg-icon-tile flex size-10 shrink-0 items-center justify-center rounded-lg text-secondary">
            <Crown aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-tertiary">
              You&apos;re a member here
            </p>
            <p className="mt-0.5 text-sm text-tertiary/70">
              {membership.workspace} {seatLabel} is reserved for you until{" "}
              {formatDay(membership.cycleEnd)}. No booking needed for it: show
              your member pass at reception.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPass(true)}
          className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
        >
          <QrCode aria-hidden="true" className="size-4" />
          Member pass
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-primary/20 pt-4">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-tertiary">
          {hoursLeft} meeting room {hoursLeft === 1 ? "hr" : "hrs"} left
        </span>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-tertiary">
          {passesLeft} guest {passesLeft === 1 ? "pass" : "passes"} left
        </span>
        <p className="text-xs text-tertiary/60">
          Used first when you book a meeting room by the hour, or full-day
          desks for guests.
        </p>
      </div>

      {showPass && (
        <MemberPassModal
          membership={membership}
          onClose={() => setShowPass(false)}
        />
      )}
    </div>
  );
};

export default MemberVenueBanner;
