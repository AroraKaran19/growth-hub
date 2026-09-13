import type { Metadata } from "next";
import BookingsPage from "../../(pages)/Account/BookingsPage";

export const metadata: Metadata = {
  title: "My Bookings",
  robots: { index: false, follow: false },
};

export default function Bookings() {
  return <BookingsPage />;
}
