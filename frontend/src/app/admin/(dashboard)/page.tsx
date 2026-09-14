import type { Metadata } from "next";
import AdminOverviewPage from "../../(pages)/Admin/AdminOverviewPage";

export const metadata: Metadata = {
  title: "Overview",
};

export default function AdminOverview() {
  return <AdminOverviewPage />;
}
