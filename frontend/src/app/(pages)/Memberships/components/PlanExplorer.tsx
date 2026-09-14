"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import {
  MAX_PAUSE_DAYS,
  MEMBERSHIP_LENGTH_DETAILS,
  MEMBERSHIP_SPACES,
  MEMBERSHIP_SPACE_TYPES,
  allowancesFor,
  type MembershipSpace,
} from "@/data/membershipPlans";
import { VENUES } from "@/data/venues";
import { MEMBERSHIP_LENGTHS, type MembershipLength } from "@/types/booking";
import { cn } from "@/utils";
import { rateFor } from "../../Booking/pricing";

const FIND_VENUE_HREF: Record<MembershipSpace, string> = {
  desk: "/workspaces?type=dedicated-desk",
  "private-cabin": "/workspaces?type=private-cabin",
  office: "/workspaces",
};

// "From" prices start at the most affordable partner venue.
const CHEAPEST_VENUE = VENUES.reduce((cheapest, venue) =>
  venue.dayPassPrice < cheapest.dayPassPrice ? venue : cheapest,
);

const PlanExplorer = () => {
  const [length, setLength] = useState<MembershipLength>("monthly");
  const details = MEMBERSHIP_LENGTH_DETAILS[length];

  return (
    <div>
      <div className="flex justify-center">
        <div
          role="group"
          aria-label="Plan length"
          className="flex flex-wrap justify-center gap-0.5 rounded-[10px] border border-tertiary/10 bg-tertiary/3 p-0.5"
        >
          {MEMBERSHIP_LENGTHS.map((value) => {
            const option = MEMBERSHIP_LENGTH_DETAILS[value];
            const isActive = value === length;

            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setLength(value)}
                className={cn(
                  "inline-flex h-9.5 min-w-28 items-center justify-center gap-2 rounded-lg px-5 text-sm transition-colors",
                  isActive
                    ? "cta-gradient font-medium text-secondary"
                    : "bg-tertiary/4 text-tertiary hover:bg-tertiary/8",
                )}
              >
                {option.plan}
                {option.discount > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs font-semibold",
                      isActive
                        ? "bg-secondary text-tertiary"
                        : "bg-green-500/15 text-green-700",
                    )}
                  >
                    -{Math.round(option.discount * 100)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
        {MEMBERSHIP_SPACE_TYPES.map((space) => {
          const plan = MEMBERSHIP_SPACES[space];
          const allowance = allowancesFor(space, length);
          const price = rateFor(CHEAPEST_VENUE, length).amount;
          const isPopular = space === "desk";

          const includes = [
            `${plan.workspace} reserved for you at one venue`,
            "Access every day the venue is open",
            `${allowance.meetingRoomHours} meeting room hours per ${details.unit}`,
            `${allowance.guestPasses} guest passes per ${details.unit}`,
            `Pause for up to ${MAX_PAUSE_DAYS} days at a time`,
            "Member pass for daily check-in",
          ];

          return (
            <article
              key={space}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6",
                isPopular
                  ? "feature-card border-primary/35"
                  : "border-tertiary/12 bg-secondary",
              )}
            >
              {isPopular && (
                <span className="absolute right-4 top-5 inline-flex items-center gap-1.5 rounded-full bg-tertiary px-3 py-1.5 text-xs font-medium text-secondary">
                  <Star aria-hidden="true" className="size-3 fill-secondary" />
                  Most chosen
                </span>
              )}

              <h3 className="text-xl font-bold text-tertiary">
                {plan.workspace}
              </h3>
              <p className="mt-1 max-w-60 text-sm text-tertiary/60">
                {plan.summary}
              </p>

              <p className="mt-6 flex flex-wrap items-baseline gap-x-1.5 text-sm text-tertiary/65">
                From
                <span className="text-3xl font-bold text-tertiary">
                  ₹{price.toLocaleString("en-IN")}
                </span>
                / {details.unit}
              </p>
              <p className="mt-1 h-4 text-xs font-medium text-green-700">
                {details.discount > 0 &&
                  `Includes ${Math.round(details.discount * 100)}% off the monthly rate`}
              </p>

              <ul className="mt-5 flex grow flex-col gap-2.5">
                {includes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-tertiary/80"
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href={FIND_VENUE_HREF[space]}
                className="cta-gradient mt-6 flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
              >
                Find a venue
              </Link>
            </article>
          );
        })}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-tertiary/55">
        Prices vary by venue and include GST. Cabins and offices are priced per
        room, desks per person. You choose the plan on the venue&apos;s booking
        page under Membership.
      </p>
    </div>
  );
};

export default PlanExplorer;
