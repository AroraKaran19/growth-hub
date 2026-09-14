import type { Metadata } from "next";
import PartnerCheckInPage from "../../../(pages)/Partner/PartnerCheckInPage";

export const metadata: Metadata = {
  title: "Check-in",
};

export default function PartnerCheckIn() {
  return <PartnerCheckInPage />;
}
