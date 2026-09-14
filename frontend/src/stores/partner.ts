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
import { useAuthStore } from "./auth";
import { useMemberBookings } from "./bookings";
import { useMemberMemberships } from "./memberships";
import { useVenueCatalog } from "./venues";

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

/** The signed-in staff account, from the partner auth store. */
export const usePartnerSession = () => {
  const status = useAuthStore("partner", (state) => state.status);
  const account = useAuthStore("partner", (state) => state.account);
  const signOut = useAuthStore("partner", (state) => state.signOut);

  const session: PartnerSession | null = account
    ? { email: account.email, staffName: account.name, venueSlug: account.venueSlug }
    : null;

  return { session, account, isReady: status !== "loading", signOut };
};

const MEMBER_PHONE = `${MEMBER.mobileCountryCode} ${MEMBER.mobile}`;

/** Everything the partner dashboard shows for its venue today. */
export const usePartnerDesk = () => {
  const isReady = useIsClient();
  const { session } = usePartnerSession();
  const venueSlug = session?.venueSlug ?? PARTNER_ACCOUNT.venueSlug;
  const today = isReady ? todayIso() : "";
  const [deskRaw, writeDesk] = useStoredItem(DESK_KEY);
  const { bookings: memberBookings } = useMemberBookings();
  const { memberships } = useMemberMemberships();
  const { venueFor, seatsFor } = useVenueCatalog();
  const venue = venueFor(
    (findVenue(venueSlug) ?? findVenue(PARTNER_ACCOUNT.venueSlug)) as Venue,
  );
  // Seats the admin panel took out of service show as blocked here too.
  const seats = seatsFor(venue.slug);

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
