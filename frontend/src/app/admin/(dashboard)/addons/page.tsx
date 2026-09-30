import type { Metadata } from "next";
import AdminAddonsPage from "../../../(pages)/Admin/AdminAddonsPage";

export const metadata: Metadata = {
  title: "Add-ons",
};

export default function AdminAddons() {
  return <AdminAddonsPage />;
}
