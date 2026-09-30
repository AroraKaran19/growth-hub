import type { ApiBooking } from "@/types/apiBooking";
import type { BookingStatus, MemberBooking } from "@/types/memberBooking";
import { formatMonthDay } from "@/utils/date";
import { BOOKING_SPACE_LABELS } from "../Booking/membershipBooking";
import { canAskToCancel } from "./cancelRequest";

const toRupees = (paise: number) => paise / 100;

const indiaDate = (instant: string) => new Date(instant).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const memberStatus = (booking: ApiBooking): BookingStatus => {
  switch (booking.status) {
    case "upcoming":
    case "checked-in":
      return booking.rescheduleCount > 0 ? "rescheduled" : "upcoming";
    case "completed":
    case "no-show":
      return "completed";
    default:
      return "cancelled";
  }
};

/** An API booking in the shape the account screens already draw, in rupees. */
export const toMemberBooking = (booking: ApiBooking): MemberBooking => ({
  id: booking.ref,
  bookingId: booking.ref,
  venueName: booking.venue.name,
  venueSlug: booking.venue.slug,
  locality: booking.venue.locality,
  city: booking.venue.city,
  image: booking.venue.image,
  status: memberStatus(booking),
  startDate: booking.date,
  endDate: booking.date,
  dateRange: formatMonthDay(booking.date),
  time: booking.timeLabel,
  type: BOOKING_SPACE_LABELS[booking.spaceType],
  seats: booking.seats.map((seat) => seat.label),
  total: toRupees(booking.price.payable),
  qrCode: booking.qrCode,
  invoiceNumber: booking.invoiceNumber,
  addons: booking.addons.map((line) => ({ name: line.name, amount: toRupees(line.amount) })),
  missed: booking.status === "no-show",
  request: booking.request ?? null,
  venueRemoval: booking.venueRemoval ?? null,
  canRequestCancel: canAskToCancel(booking.status, booking.request ?? null),
  ...(booking.status === "cancelled" &&
    booking.request?.status === "approved" && {
      refund: toRupees(booking.request.refundAmount ?? 0),
      cancelledOn: booking.request.decidedAt ? indiaDate(booking.request.decidedAt) : undefined,
    }),
});

/** What the Profile numbers need, keeping the true status so missed visits count. */
export const toStatsBooking = (booking: ApiBooking) => ({
  venueName: booking.venue.name,
  locality: booking.venue.locality,
  startDate: booking.date,
  endDate: booking.date,
  time: booking.timeLabel,
  total: toRupees(booking.price.payable),
  status: booking.status,
});
