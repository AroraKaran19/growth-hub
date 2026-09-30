import type { Metadata } from "next";
import PartnerRequestsPage from "../../../(pages)/Partner/PartnerRequestsPage";

export const metadata: Metadata = {
  title: "Cancellation requests",
};

export default function PartnerRequests() {
  return <PartnerRequestsPage />;
}
