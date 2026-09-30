import type { Metadata } from "next";
import BookingDetailPage from "../../../(pages)/Account/BookingDetailPage";

type BookingRouteProps = {
  params: Promise<{ bookingId: string }>;
};

export const metadata: Metadata = {
  title: "Booking details",
  robots: { index: false, follow: false },
};

export default async function BookingRoute({ params }: BookingRouteProps) {
  const { bookingId } = await params;
  return <BookingDetailPage bookingId={bookingId} />;
}
