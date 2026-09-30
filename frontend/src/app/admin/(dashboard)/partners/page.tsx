import type { Metadata } from "next";
import AdminPartnersPage from "../../../(pages)/Admin/AdminPartnersPage";

export const metadata: Metadata = {
  title: "Partner accounts",
};

export default function AdminPartners() {
  return <AdminPartnersPage />;
}
