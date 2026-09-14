import type { Metadata } from "next";
import PartnerMembersPage from "../../../(pages)/Partner/PartnerMembersPage";

export const metadata: Metadata = {
  title: "Members",
};

export default function PartnerMembers() {
  return <PartnerMembersPage />;
}
