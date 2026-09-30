import { env } from "../config/env";
import type { BookedAddon, BookedSeat, BookingDoc } from "../models";
import { timeLabel } from "../utils/indiaTime";
import { signCode } from "../utils/qr";
import { effectiveStatus } from "./bookingRules";
import type { PassPrice, PassType } from "./pricing";

export type BookingView = {
  ref: string;
  status: string;
  venue: { slug: string; name: string; locality: string; city: string; image: string };
  seats: BookedSeat[];
  spaceType: string;
  passType: PassType;
  date: string;
  startMin: number;
  endMin: number;
  timeLabel: string;
  people: number;
  extras: { preference: string; companyName: string };
  addons: BookedAddon[];
  /** Paise. */
  price: PassPrice;
  invoiceNumber: string | null;
  rescheduleCount: number;
  hasOpenRequest: boolean;
  checkedInAt: string | null;
  holdExpiresAt: string | null;
  holdCapAt: string | null;
  paidAt: string | null;
  /** Only while the booking can still be checked in. */
  qrCode: string | null;
  createdAt: string;
};

const iso = (value: Date | null | undefined) => (value ? new Date(value).toISOString() : null);

export const toBookingView = (booking: BookingDoc, now = new Date()): BookingView => {
  const status = effectiveStatus(booking, now);
  const secret = env().qrSigningSecret;
  const canCheckIn = status === "upcoming" || status === "checked-in";
  return {
    ref: booking.ref,
    status,
    venue: { slug: booking.venueSlug, ...booking.venue },
    seats: booking.seats,
    spaceType: booking.spaceType,
    passType: booking.passType,
    date: booking.date,
    startMin: booking.startMin,
    endMin: booking.endMin,
    timeLabel: `${timeLabel(booking.startMin)} - ${timeLabel(booking.endMin)}`,
    people: booking.people,
    extras: booking.extras,
    addons: booking.addons,
    price: booking.price,
    invoiceNumber: booking.invoiceNumber,
    rescheduleCount: booking.rescheduleCount,
    hasOpenRequest: Boolean(booking.openRequestId),
    checkedInAt: iso(booking.checkedInAt),
    holdExpiresAt: status === "pending-payment" ? iso(booking.holdExpiresAt) : null,
    holdCapAt: status === "pending-payment" ? iso(booking.holdCapAt) : null,
    paidAt: iso(booking.payment?.capturedAt),
    qrCode: canCheckIn && secret ? signCode("b", booking.ref, secret) : null,
    createdAt: new Date(booking.createdAt).toISOString(),
  };
};
