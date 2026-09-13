import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingDetailPage from "../../../(pages)/Account/BookingDetailPage";
import { MEMBER_BOOKINGS } from "@/data/memberBookings";

type BookingRouteProps = {
  params: Promise<{ bookingId: string }>;
};

export function generateStaticParams() {
  return MEMBER_BOOKINGS.map((booking) => ({ bookingId: booking.bookingId }));
}

export const metadata: Metadata = {
  title: "Booking details",
  robots: { index: false, follow: false },
};

export default async function BookingRoute({ params }: BookingRouteProps) {
  const { bookingId } = await params;
  const booking = MEMBER_BOOKINGS.find(
    (item) => item.bookingId === bookingId,
  );

  if (!booking) notFound();

  return <BookingDetailPage booking={booking} />;
}
