import type { Metadata } from "next";
import PartnerPricesPage from "../../../(pages)/Partner/PartnerPricesPage";

export const metadata: Metadata = {
  title: "Prices",
};

export default function PartnerPrices() {
  return <PartnerPricesPage />;
}
