"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Check } from "lucide-react";
import DirectionsLink from "@/app/components/ui/DirectionsLink";
import type { MemberMembership } from "@/types/membership";
import type { Venue } from "@/types/venue";
import { formatDay } from "@/utils/date";

type MembershipConfirmedProps = {
  membership: MemberMembership;
  venue: Venue;
};

const ROW_LABEL = "text-xs text-tertiary/50";
const ROW_VALUE = "text-sm font-medium text-tertiary";

const MembershipConfirmed = ({ membership, venue }: MembershipConfirmedProps) => {
  const rows = [
    { label: "Plan", value: `${membership.plan} ${membership.workspace}` },
    { label: "Your seat", value: membership.seats.join(", ") },
    { label: "Starts", value: formatDay(membership.cycleStart) },
    { label: "Renews on", value: formatDay(membership.cycleEnd) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tertiary/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-confirmed-title"
        className="w-full max-w-md rounded-2xl bg-secondary p-6 text-center sm:p-8"
      >
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-500">
          <Check aria-hidden="true" className="size-8 text-secondary" />
        </span>

        <h2
          id="membership-confirmed-title"
          className="mt-5 text-2xl font-bold text-tertiary"
        >
          Membership Active
        </h2>
        <p className="mt-1 text-sm text-tertiary/60">
          Welcome to {venue.name}. Your seat is reserved from{" "}
          {formatDay(membership.cycleStart)}, so there is nothing else to book.
        </p>

        <div className="mt-6 flex overflow-hidden rounded-xl bg-tertiary/4 text-left">
          <div className="flex shrink-0 flex-col items-center justify-center gap-2 p-4">
            <QRCodeSVG
              value={`growthhub:member:${membership.id}`}
              size={96}
              level="M"
              aria-label="Member pass QR code"
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Member pass
            </span>
          </div>

          <div
            aria-hidden="true"
            className="my-3 border-l border-dashed border-tertiary/25"
          />

          <dl className="grid min-w-0 grow grid-cols-1 gap-2 p-4">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className={ROW_LABEL}>{row.label}</dt>
                <dd className={ROW_VALUE}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-4 text-sm text-tertiary/60">
          Includes {membership.meetingRoomHours.included} meeting room hours
          and {membership.guestPasses.included} guest passes each cycle. Open{" "}
          {venue.openHours}.
        </p>

        <div className="mt-4 flex justify-center">
          <DirectionsLink url={venue.googleMapsUrl} />
        </div>

        <div className="mt-6 flex items-center justify-center gap-5">
          <Link
            href="/"
            className="text-sm text-tertiary underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Go to Home
          </Link>
          <Link
            href="/account/memberships"
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            View Membership
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MembershipConfirmed;
