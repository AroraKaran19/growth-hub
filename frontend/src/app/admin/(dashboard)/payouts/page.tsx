import type { Metadata } from "next";
import AdminPayoutsPage from "../../../(pages)/Admin/AdminPayoutsPage";

export const metadata: Metadata = {
  title: "Payouts",
};

export default function AdminPayouts() {
  return <AdminPayoutsPage />;
}
