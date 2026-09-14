import type { Metadata } from "next";
import ContactPage from "../(pages)/Contact/ContactPage";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Growth Hub about bookings, memberships, payments or listing your coworking space.",
};

export default function Contact() {
  return <ContactPage />;
}
