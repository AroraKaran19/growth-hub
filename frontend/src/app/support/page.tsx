import type { Metadata } from "next";
import SupportPage from "../(pages)/Help/SupportPage";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Get help with Growth Hub bookings, refunds, memberships, check-in and your account.",
};

export default function Support() {
  return <SupportPage />;
}
