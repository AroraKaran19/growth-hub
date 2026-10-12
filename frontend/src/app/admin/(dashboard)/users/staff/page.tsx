import type { Metadata } from "next";
import AdminStaffPage from "../../../../(pages)/Admin/AdminStaffPage";

export const metadata: Metadata = {
  title: "Staff",
};

export default function AdminStaff() {
  return <AdminStaffPage />;
}
