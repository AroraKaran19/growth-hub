import type { Metadata } from "next";
import { pageMetadata } from "@/libs/seo";
import PricingPage from "../(pages)/Pricing/PricingPage";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("pricing");

export const revalidate = 300;

export default function Pricing() {
  return <PricingPage />;
}
