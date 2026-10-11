import type { Metadata } from "next";
import AdminSettingsPage from "../../../(pages)/Admin/AdminSettingsPage";

export const metadata: Metadata = {
  title: "Site settings",
};

export default function AdminSettings() {
  return <AdminSettingsPage />;
}
