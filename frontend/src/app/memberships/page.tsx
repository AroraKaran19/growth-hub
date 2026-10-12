import type { Metadata } from "next";
import MembershipPlansPage from "../(pages)/Memberships/MembershipPlansPage";

export const metadata: Metadata = {
  title: "Memberships",
  description:
    "Reserve a desk, cabin, office or meeting room at a Growth Hub partner venue with each venue's membership plans.",
};

export const revalidate = 300;

export default function Memberships() {
  return <MembershipPlansPage />;
}
