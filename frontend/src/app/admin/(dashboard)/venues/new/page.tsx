import type { Metadata } from "next";
import AdminVenueNewPage from "../../../../(pages)/Admin/AdminVenueNewPage";

export const metadata: Metadata = {
  title: "New venue",
};

export default function AdminVenueNew() {
  return <AdminVenueNewPage />;
}
