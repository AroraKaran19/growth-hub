import type { Metadata } from "next";
import InvoicePage from "../../(pages)/Invoice/InvoicePage";
import { MEMBER_BOOKINGS } from "@/data/memberBookings";

type InvoiceRouteProps = {
  params: Promise<{ bookingId: string }>;
};

export function generateStaticParams() {
  return MEMBER_BOOKINGS.map((booking) => ({ bookingId: booking.bookingId }));
}

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

export default async function InvoiceRoute({ params }: InvoiceRouteProps) {
  const { bookingId } = await params;
  // Bookings made in the browser are not known here; the page looks them up.
  const booking = MEMBER_BOOKINGS.find((item) => item.bookingId === bookingId);

  return <InvoicePage bookingId={bookingId} issuedBooking={booking} />;
}
