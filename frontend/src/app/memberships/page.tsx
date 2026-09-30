import type { Metadata } from "next";
import MembershipPlansPage from "../(pages)/Memberships/MembershipPlansPage";

export const metadata: Metadata = {
  title: "Memberships",
  description:
    "Reserve a desk, cabin or office at a Growth Hub partner venue with weekly, monthly, 3 month and 6 month plans.",
};

export const revalidate = 300;

export default function Memberships() {
  return <MembershipPlansPage />;
}
