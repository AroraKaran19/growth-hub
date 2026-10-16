import type { Metadata } from "next";
import AdminSupportPage from "../../../(pages)/Admin/AdminSupportPage";

export const metadata: Metadata = {
  title: "Support requests",
};

export default function AdminSupport() {
  return <AdminSupportPage />;
}
