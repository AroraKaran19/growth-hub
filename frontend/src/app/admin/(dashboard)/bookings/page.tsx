import type { Metadata } from "next";
import AdminBookingsPage from "../../../(pages)/Admin/AdminBookingsPage";

export const metadata: Metadata = {
  title: "Bookings",
};

export default function AdminBookings() {
  return <AdminBookingsPage />;
}
