import type { Metadata } from "next";
import PartnerBookingsPage from "../../../(pages)/Partner/PartnerBookingsPage";

export const metadata: Metadata = {
  title: "Bookings",
};

export default function PartnerBookings() {
  return <PartnerBookingsPage />;
}
