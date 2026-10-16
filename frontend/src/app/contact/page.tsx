import type { Metadata } from "next";
import { pageMetadata } from "@/libs/seo";
import ContactPage from "../(pages)/Contact/ContactPage";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("contact");

export default function Contact() {
  return <ContactPage />;
}
