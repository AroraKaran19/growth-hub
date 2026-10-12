"use client";

import { useState } from "react";
import { CircleAlert, Crown, QrCode } from "lucide-react";
import type { ApiMembership } from "@/types/membership";
import { formatDay } from "@/utils/date";
import { daysPhrase, membershipTitle, windowLabel } from "@/utils/plans";
import MemberPassModal from "../../Account/components/MemberPassModal";

/** Tells a member their seat is already theirs before they book anything. */
const MemberVenueBanner = ({ membership }: { membership: ApiMembership }) => {
  const [showPass, setShowPass] = useState(false);
  const seatLabel = membership.seats.map((seat) => seat.label).join(", ");
  const isPastDue = membership.status === "past-due";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-5 shadow-sm">
      <p className="flex max-w-2xl items-start gap-3 text-sm text-tertiary/80">
        {isPastDue ? (
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700" />
        ) : (
          <Crown aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        )}
        <span>
          <span className="block text-base font-semibold text-tertiary">You&apos;re a member here</span>
          {membershipTitle(membership)} keeps {seatLabel} for you {daysPhrase(membership.plan?.days)}
          {membership.window ? `, ${windowLabel(membership.window)}` : ""}
          {membership.paidThrough ? `, until ${formatDay(membership.paidThrough)}` : ""}. Book below only for extra
          seats or rooms.
          {isPastDue && " Your last renewal payment failed; update it in Razorpay to keep your seat."}
        </span>
      </p>
      <button
        type="button"
        onClick={() => setShowPass(true)}
        className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
      >
        <QrCode aria-hidden="true" className="size-4" />
        Member pass
      </button>
      {showPass && <MemberPassModal membership={membership} onClose={() => setShowPass(false)} />}
    </div>
  );
};

export default MemberVenueBanner;
