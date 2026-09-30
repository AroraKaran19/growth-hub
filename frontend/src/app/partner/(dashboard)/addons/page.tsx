import type { Metadata } from "next";
import PartnerAddonsPage from "../../../(pages)/Partner/PartnerAddonsPage";

export const metadata: Metadata = {
  title: "Add-ons",
};

export default function PartnerAddons() {
  return <PartnerAddonsPage />;
}
