import type { Metadata } from "next";
import CouponsPage from "../../(pages)/Account/CouponsPage";

export const metadata: Metadata = {
  title: "My Coupons",
  robots: { index: false, follow: false },
};

export default function Coupons() {
  return <CouponsPage />;
}
