import type { Metadata } from "next";
import PartnerOverviewPage from "../../(pages)/Partner/PartnerOverviewPage";

export const metadata: Metadata = {
  title: "Overview",
};

export default function PartnerOverview() {
  return <PartnerOverviewPage />;
}
