import type { Metadata } from "next";
import { pageMetadata } from "@/libs/seo";
import SupportPage from "../(pages)/Help/SupportPage";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("support");

export default function Support() {
  return <SupportPage />;
}
