"use client";

import { useMemo } from "react";
import { MEMBER } from "@/data/member";
import {
  PARTNER_ACCOUNT,
  PARTNER_SEED_BOOKINGS,
  PARTNER_SEED_MEMBERS,
} from "@/data/partner";
import { findVenue } from "@/data/venues";
import type {
  PartnerBooking,
  PartnerMember,
  PartnerSession,
} from "@/types/partner";
import type { Venue } from "@/types/venue";
import { todayIso } from "@/utils/date";
import { readStoredItem, useIsClient, useStoredItem } from "@/utils/storage";
import { addDays } from "@/app/(pages)/Account/membershipCycle";
import { useMemberBookings } from "./bookings";
import { useMemberMemberships } from "./memberships";
import { useVenueCatalog } from "./venues";

const SESSION_KEY = "growth-hub:partner-session";
const DESK_KEY = "growth-hub:partner-desk";

/** What the front desk recorded today. Resets when the date changes. */
type DeskDay = {
  date: string;
  /** Booking or membership id to the ISO time of check-in. */
  checkIns: Record<string, string>;
  /** Seat ids marked as taken by walk-ins. */
  walkIns: string[];
};

const parseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/** MOCK partner sign-in, separate from the member session. */
export const usePartnerSession = () => {
  const [saved, write] = useStoredItem(SESSION_KEY);
  const isReady = useIsClient();
  const session = useMemo(
    () => parseJson<PartnerSession | null>(saved, null),
    [saved],
  );

  return {
    session,
    isReady,
    signIn: (next: PartnerSession) => write(JSON.stringify(next)),
    signOut: () => write(null),
  };
};

const MEMBER_PHONE = `${MEMBER.mobileCountryCode} ${MEMBER.mobile}`;

/** Everything the partner dashboard shows for its venue today. */
export const usePartnerDesk = () => {
  const isReady = useIsClient();
  const today = isReady ? todayIso() : "";
  const [deskRaw, writeDesk] = useStoredItem(DESK_KEY);
  const { bookings: memberBookings } = useMemberBookings();
  const { memberships } = useMemberMemberships();
  const { venueFor, seatsFor } = useVenueCatalog();
  const venue = venueFor(findVenue(PARTNER_ACCOUNT.venueSlug) as Venue);
  // Seats the admin panel took out of service show as blocked here too.
  const seats = seatsFor(PARTNER_ACCOUNT.venueSlug);

  const desk = useMemo<DeskDay>(() => {
    const saved = parseJson<DeskDay | null>(deskRaw, null);
    return saved && saved.date === today
      ? saved
      : { date: today, checkIns: {}, walkIns: [] };
  }, [deskRaw, today]);

  const bookings = useMemo<PartnerBooking[]>(() => {
    if (!today) return [];

    const seeded: PartnerBooking[] = PARTNER_SEED_BOOKINGS.map(
      ({ dayOffset, ...booking }) => ({
        ...booking,
        date: addDays(today, dayOffset),
        source: "seed",
      }),
    );

    // The member site's bookings at this venue, so both surfaces agree.
    const fromMemberApp: PartnerBooking[] = memberBookings
      .filter((booking) => booking.venueSlug === venue.slug)
      .map((booking) => ({
        bookingId: booking.bookingId,
        memberName: MEMBER.name,
        phone: MEMBER_PHONE,
        type: booking.type,
        seats: booking.seats,
        date: booking.startDate,
        time: booking.time,
        total: booking.total,
        status:
          booking.status === "cancelled"
            ? "cancelled"
            : booking.status === "completed"
              ? "completed"
              : "upcoming",
        source: "member-app",
      }));

    return [...fromMemberApp, ...seeded].map((booking) =>
      booking.status === "upcoming" && desk.checkIns[booking.bookingId]
        ? { ...booking, status: "checked-in" }
        : booking,
    );
  }, [today, memberBookings, venue.slug, desk.checkIns]);

  const members = useMemo<PartnerMember[]>(() => {
    const fromMemberApp: PartnerMember[] = memberships
      .filter(
        (membership) =>
          membership.venueSlug === venue.slug && membership.status !== "expired",
      )
      .map((membership) => ({
        membershipId: membership.id,
        memberName: MEMBER.name,
        phone: MEMBER_PHONE,
        plan: membership.plan,
        workspace: membership.workspace,
        seats: membership.seats,
        status: membership.status,
        renewsOn: membership.cycleEnd,
        resumesOn: membership.resumesOn ?? undefined,
        source: "member-app",
      }));

    return [...fromMemberApp, ...PARTNER_SEED_MEMBERS];
  }, [memberships, venue.slug]);

  // Reads the stored day at call time so quick successive actions stack.
  const updateDesk = (change: (current: DeskDay) => DeskDay) => {
    const saved = parseJson<DeskDay | null>(readStoredItem(DESK_KEY), null);
    const current =
      saved && saved.date === today
        ? saved
        : { date: today, checkIns: {}, walkIns: [] };
    writeDesk(JSON.stringify(change(current)));
  };

  const checkIn = (id: string) =>
    updateDesk((current) => ({
      ...current,
      checkIns: { ...current.checkIns, [id]: new Date().toISOString() },
    }));

  const toggleWalkIn = (seatId: string) =>
    updateDesk((current) => ({
      ...current,
      walkIns: current.walkIns.includes(seatId)
        ? current.walkIns.filter((id) => id !== seatId)
        : [...current.walkIns, seatId],
    }));

  return {
    isReady,
    today,
    venue,
    seats,
    bookings,
    members,
    checkIns: desk.checkIns,
    walkIns: desk.walkIns,
    /** Every member-site booking, to explain scans meant for other venues. */
    allMemberBookings: memberBookings,
    allMemberships: memberships,
    checkIn,
    toggleWalkIn,
  };
};
