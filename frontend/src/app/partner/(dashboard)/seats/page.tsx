import type { Metadata } from "next";
import PartnerSeatsPage from "../../../(pages)/Partner/PartnerSeatsPage";

export const metadata: Metadata = {
  title: "Seats",
};

export default function PartnerSeats() {
  return <PartnerSeatsPage />;
}
