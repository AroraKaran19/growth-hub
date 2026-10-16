import type { Metadata } from "next";
import { pageMetadata } from "@/libs/seo";
import MembershipPlansPage from "../(pages)/Memberships/MembershipPlansPage";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("memberships");

export const revalidate = 300;

export default function Memberships() {
  return <MembershipPlansPage />;
}
