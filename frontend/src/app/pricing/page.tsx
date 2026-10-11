import type { Metadata } from "next";
import PricingPage from "../(pages)/Pricing/PricingPage";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Hourly, half-day and full-day passes and membership plans at Growth Hub partner venues.",
};

export const revalidate = 300;

export default function Pricing() {
  return <PricingPage />;
}
