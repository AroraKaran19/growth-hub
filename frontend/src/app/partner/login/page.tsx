import type { Metadata } from "next";
import PartnerLoginPage from "../../(pages)/Partner/PartnerLoginPage";

export const metadata: Metadata = {
  title: "Partner sign in",
  robots: { index: false, follow: false },
};

export default function PartnerLogin() {
  return <PartnerLoginPage />;
}
