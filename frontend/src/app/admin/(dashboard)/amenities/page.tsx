import type { Metadata } from "next";
import AdminAmenitiesPage from "../../../(pages)/Admin/AdminAmenitiesPage";

export const metadata: Metadata = {
  title: "Amenities",
};

export default function AdminAmenities() {
  return <AdminAmenitiesPage />;
}
