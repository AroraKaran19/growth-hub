import type { Metadata } from "next";
import AdminMembershipsPage from "../../../(pages)/Admin/AdminMembershipsPage";

export const metadata: Metadata = {
  title: "Memberships",
};

export default function AdminMemberships() {
  return <AdminMembershipsPage />;
}
