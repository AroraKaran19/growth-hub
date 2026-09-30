import type { Metadata } from "next";
import AdminSeatMapsPage from "../../../(pages)/Admin/AdminSeatMapsPage";

export const metadata: Metadata = {
  title: "Seat maps",
};

export default function AdminSeatMaps() {
  return <AdminSeatMapsPage />;
}
