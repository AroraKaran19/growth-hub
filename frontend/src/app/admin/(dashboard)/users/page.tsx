import type { Metadata } from "next";
import AdminUsersPage from "../../../(pages)/Admin/AdminUsersPage";

export const metadata: Metadata = {
  title: "Manage users",
};

export default function AdminUsers() {
  return <AdminUsersPage />;
}
