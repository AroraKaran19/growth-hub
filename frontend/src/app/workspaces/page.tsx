import type { Metadata } from "next";
import { pageMetadata } from "@/libs/seo";
import WorkspacesPage from "../(pages)/Workspaces/WorkspacesPage";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("workspaces");

export const revalidate = 300;

export default function Workspaces() {
  return <WorkspacesPage />;
}
