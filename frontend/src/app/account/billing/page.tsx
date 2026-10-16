import type { Metadata } from "next";
import BillingPage from "../../(pages)/Account/BillingPage";

export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false, follow: false },
};

export default function Billing() {
  return <BillingPage />;
}
