import type { Metadata } from "next";
import AdminLabelsPage from "../../../(pages)/Admin/AdminLabelsPage";

export const metadata: Metadata = {
  title: "Labels",
};

export default function AdminLabels() {
  return <AdminLabelsPage />;
}
