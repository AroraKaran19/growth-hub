import type { Metadata } from "next";
import WorkspacesPage from "../(pages)/Workspaces/WorkspacesPage";

export const metadata: Metadata = {
  title: "Workspaces",
  description:
    "Browse coworking spaces, meeting rooms and private offices from Growth Hub partner venues across Bangalore.",
};

export default function Workspaces() {
  return <WorkspacesPage />;
}
