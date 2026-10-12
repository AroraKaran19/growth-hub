import type { Metadata } from "next";
import AdminMembershipPlansPage from "../../../(pages)/Admin/AdminMembershipPlansPage";

export const metadata: Metadata = {
  title: "Membership plans",
};

export default function AdminMembershipPlans() {
  return <AdminMembershipPlansPage />;
}
