"use client";

import { createContext, useContext, useMemo } from "react";
import { toast } from "react-toastify";
import { usePartnerToday } from "@/hooks/usePartnerToday";
import { usePartnerBookings, usePartnerMembers } from "@/hooks/useStaffBookings";
import { readApiError } from "@/libs/api/errors";
import { recordDeskAddons, voidDeskAddons } from "@/libs/api/addonOrders";
import {
  addWalkIn,
  checkInAtDesk,
  removeWalkIn,
  type DeskSale,
  type TodayAddon,
  type TodayMember,
} from "@/libs/api/partnerDesk";
import type {
  CheckInInput,
  CheckInResult,
  PartnerBooking,
  PartnerMember,
  PartnerSession,
} from "@/types/partner";
import type { DeskAddonTarget } from "@/types/addonOrder";
import type { StaffMembership } from "@/types/membership";
import type { Seat } from "@/types/seat";
import type { PartnerVenue } from "@/types/venue";
import { todayIso } from "@/utils/date";
import { membershipTitle, spaceName } from "@/utils/membershipLabels";
import { useIsClient } from "@/utils/storage";
import { BOOKING_SPACE_LABELS } from "@/app/(pages)/Booking/membershipBooking";
import { isMemberRef, outcomeOfCheckIn, outcomeOfError } from "@/app/(pages)/Partner/verify";
import { useAuthStore } from "./auth";

const NO_SEATS: Seat[] = [];

const toPartnerMember = (membership: StaffMembership, today: TodayMember | undefined): PartnerMember => ({
  membershipId: membership.ref,
  memberName: membership.member.name,
  phone: membership.member.phone,
  plan: membershipTitle(membership),
  workspace: spaceName(membership.spaceType),
  planSnapshot: membership.plan,
  window: membership.window,
  seatList: membership.seatList,
  seats: membership.seats,
  people: membership.people,
  status: membership.status,
  startDate: membership.startDate,
  paidThrough: membership.paidThrough ?? membership.startDate,
  renewsOn: membership.renewsOn,
  today: today ? { checkedInAt: today.checkedInAt, seats: today.seatCheckIns } : null,
});

/** The partner's venue, loaded once by the shell for every page inside it. */
export const PartnerVenueContext = createContext<PartnerVenue | null>(null);

const useShellVenue = () => {
  const venue = useContext(PartnerVenueContext);
  if (!venue) throw new Error("Partner pages must render inside PartnerShell");
  return venue;
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

/** Everything the partner dashboard shows for its venue today, from the server. */
export const usePartnerDesk = () => {
  const isClient = useIsClient();
  const { today: feed, isLoading: isFeedLoading, mutate: refreshFeed } = usePartnerToday();
  const { bookings: apiBookings, isLoading: areBookingsLoading, mutate: refreshBookings } = usePartnerBookings();
  const { members: apiMembers, isLoading: areMembersLoading } = usePartnerMembers();
  const venue = useShellVenue();
  // Seats the admin panel took out of service arrive marked unavailable.
  const seats = venue.seatMap?.seats ?? NO_SEATS;
  // India date from the server, so a desk in another zone still sees the venue's day.
  const today = feed?.date ?? (isClient ? todayIso() : "");

  const checkIns = useMemo<Record<string, string>>(() => {
    if (!feed) return {};
    const entries = [
      ...feed.bookings.filter((booking) => booking.checkedInAt).map((booking) => [booking.ref, booking.checkedInAt!] as const),
      ...feed.members.filter((member) => member.checkedInAt).map((member) => [member.ref, member.checkedInAt!] as const),
    ];
    return Object.fromEntries(entries);
  }, [feed]);

  const bookings = useMemo<PartnerBooking[]>(
    () =>
      apiBookings.map((booking): PartnerBooking => ({
        bookingId: booking.ref,
        memberName: booking.member.name,
        phone: booking.member.phone,
        type: BOOKING_SPACE_LABELS[booking.spaceType],
        seats: booking.seats,
        people: booking.people,
        date: booking.date,
        time: booking.timeLabel,
        total: booking.total / 100,
        status: booking.status === "pending-payment" || booking.status === "expired" ? "cancelled" : booking.status,
        source: "api",
      })),
    [apiBookings],
  );

  const members = useMemo<PartnerMember[]>(() => {
    const dueToday = new Map((feed?.members ?? []).map((member) => [member.ref, member]));
    return apiMembers.map((membership) => toPartnerMember(membership, dueToday.get(membership.ref)));
  }, [apiMembers, feed]);

  // Only memberships whose days cover today, straight from the live feed.
  const todayMembers = useMemo<PartnerMember[]>(
    () => (feed?.members ?? []).map((member) => toPartnerMember(member, member)),
    [feed],
  );

  const refresh = () => Promise.all([refreshFeed(), refreshBookings()]);

  const addonsByTarget = useMemo(() => {
    const grouped: Record<string, TodayAddon[]> = {};
    for (const addon of feed?.addons ?? []) (grouped[addon.targetRef] ??= []).push(addon);
    return grouped;
  }, [feed]);

  const salesByTarget = useMemo(() => {
    const grouped: Record<string, DeskSale[]> = {};
    for (const sale of feed?.deskSalesToday ?? []) (grouped[sale.targetRef] ??= []).push(sale);
    return grouped;
  }, [feed]);

  /** Throws the server's refusal, for the modal to show inline. */
  const recordAddons = async (target: DeskAddonTarget, addonKeys: string[]) => {
    const order = await recordDeskAddons(target, addonKeys);
    await refreshFeed();
    return order;
  };

  const voidAddons = async (orderRef: string) => {
    try {
      await voidDeskAddons(orderRef);
      await refreshFeed();
      toast.success("Desk sale voided.", { autoClose: 3000 });
    } catch (caught) {
      toast.error(readApiError(caught).message, { autoClose: 6000 });
    }
  };

  /** Throws the server's refusal, for screens that show it inline. */
  const checkIn = async (target: string | CheckInInput, seatId?: string): Promise<CheckInResult> => {
    const input: CheckInInput =
      typeof target !== "string"
        ? target
        : isMemberRef(target)
          ? { membershipRef: target, ...(seatId ? { seatId } : {}) }
          : { bookingRef: target };
    const result = await checkInAtDesk(input);
    await refresh();
    return result;
  };

  /** For one-tap buttons in lists: the outcome shows as a toast. */
  const quickCheckIn = async (id: string, seatId?: string) => {
    try {
      const outcome = outcomeOfCheckIn(await checkIn(id, seatId));
      (outcome.tone === "success" ? toast.success : toast.warning)(outcome.detail, { autoClose: 4000 });
    } catch (caught) {
      const info = readApiError(caught);
      const outcome = outcomeOfError(info.code, info.message, info.meta);
      toast.error(
        info.code === "SEAT_REQUIRED" ? "This plan has several seats. Check each holder in from their own seat." : outcome.detail,
        { autoClose: 6000 },
      );
    }
  };

  const toggleWalkIn = async (seatId: string) => {
    try {
      if (feed?.walkInSeatIds.includes(seatId)) await removeWalkIn(seatId);
      else await addWalkIn(seatId);
      await refreshFeed();
    } catch (caught) {
      toast.error(readApiError(caught).message, { autoClose: 6000 });
    }
  };

  return {
    isReady: isClient && !isFeedLoading && !areBookingsLoading && !areMembersLoading,
    today,
    venue,
    seats,
    bookings,
    members,
    todayMembers,
    checkIns,
    walkIns: feed?.walkInSeatIds ?? [],
    beingBooked: feed?.beingBookedSeatIds ?? [],
    addonsByTarget,
    salesByTarget,
    recordAddons,
    voidAddons,
    checkIn,
    quickCheckIn,
    toggleWalkIn,
  };
};
