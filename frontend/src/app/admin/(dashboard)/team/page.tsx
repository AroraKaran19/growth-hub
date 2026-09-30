import type { Metadata } from "next";
import AdminTeamPage from "../../../(pages)/Admin/AdminTeamPage";

export const metadata: Metadata = {
  title: "Team",
};

export default function AdminTeam() {
  return <AdminTeamPage />;
}
