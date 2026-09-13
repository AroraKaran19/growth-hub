import type { Metadata } from "next";
import MembershipsPage from "../../(pages)/Account/MembershipsPage";

export const metadata: Metadata = {
  title: "My Memberships",
  robots: { index: false, follow: false },
};

export default function Memberships() {
  return <MembershipsPage />;
}
