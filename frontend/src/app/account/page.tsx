import type { Metadata } from "next";
import ProfilePage from "../(pages)/Account/ProfilePage";

export const metadata: Metadata = {
  title: "My Profile",
  robots: { index: false, follow: false },
};

export default function Account() {
  return <ProfilePage />;
}
