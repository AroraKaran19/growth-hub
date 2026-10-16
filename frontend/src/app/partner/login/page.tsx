import type { Metadata } from "next";
import { withDefaults } from "@/config/homeDefaults";
import { getHomeOverrides } from "@/libs/api/site";
import PartnerLoginPage from "../../(pages)/Partner/PartnerLoginPage";

export const metadata: Metadata = {
  title: "Partner sign in",
  robots: { index: false, follow: false },
};

export default async function PartnerLogin() {
  const { signin } = withDefaults(await getHomeOverrides());
  return <PartnerLoginPage image={signin.partner} />;
}
