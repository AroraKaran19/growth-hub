import type { Metadata } from "next";
import AdminVenuesPage from "../../../(pages)/Admin/AdminVenuesPage";

export const metadata: Metadata = {
  title: "Venues",
};

export default function AdminVenues() {
  return <AdminVenuesPage />;
}
