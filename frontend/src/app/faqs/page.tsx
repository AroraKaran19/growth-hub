import type { Metadata } from "next";
import { pageMetadata } from "@/libs/seo";
import FaqsPage from "../(pages)/Help/FaqsPage";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("faqs");

export default function Faqs() {
  return <FaqsPage />;
}
