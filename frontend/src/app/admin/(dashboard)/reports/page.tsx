import type { Metadata } from "next";
import AdminReportsPage from "../../../(pages)/Admin/AdminReportsPage";

export const metadata: Metadata = {
  title: "Reports",
};

export default function AdminReports() {
  return <AdminReportsPage />;
}
