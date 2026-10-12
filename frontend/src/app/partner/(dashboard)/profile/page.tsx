import type { Metadata } from "next";
import PartnerProfilePage from "../../../(pages)/Partner/PartnerProfilePage";

export const metadata: Metadata = {
  title: "Your profile",
};

export default function PartnerProfile() {
  return <PartnerProfilePage />;
}
