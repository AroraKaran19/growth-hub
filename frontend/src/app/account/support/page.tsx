import type { Metadata } from "next";
import SupportRequestsPage from "../../(pages)/Account/SupportRequestsPage";

export const metadata: Metadata = {
  title: "Support",
  robots: { index: false, follow: false },
};

export default function Support() {
  return <SupportRequestsPage />;
}
