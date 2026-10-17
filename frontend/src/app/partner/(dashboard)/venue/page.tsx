import type { Metadata } from "next";
import PartnerVenuePage from "../../../(pages)/Partner/PartnerVenuePage";

export const metadata: Metadata = {
  title: "Venue settings",
};

export default function PartnerVenue() {
  return <PartnerVenuePage />;
}
