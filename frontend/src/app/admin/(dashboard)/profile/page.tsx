import type { Metadata } from "next";
import AdminProfilePage from "../../../(pages)/Admin/AdminProfilePage";

export const metadata: Metadata = {
  title: "Your profile",
};

export default function AdminProfile() {
  return <AdminProfilePage />;
}
