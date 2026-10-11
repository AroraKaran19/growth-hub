import type { Metadata } from "next";
import AdminWorkspaceTypesPage from "../../../(pages)/Admin/AdminWorkspaceTypesPage";

export const metadata: Metadata = {
  title: "Workspace types",
};

export default function AdminWorkspaceTypes() {
  return <AdminWorkspaceTypesPage />;
}
