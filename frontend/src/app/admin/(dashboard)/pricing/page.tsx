import type { Metadata } from "next";
import AdminPricingPage from "../../../(pages)/Admin/AdminPricingPage";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function AdminPricing() {
  return <AdminPricingPage />;
}
