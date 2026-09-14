import type { Metadata } from "next";
import FaqsPage from "../(pages)/Help/FaqsPage";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Answers to common questions about Growth Hub bookings, payments, memberships, check-in and accounts.",
};

export default function Faqs() {
  return <FaqsPage />;
}
