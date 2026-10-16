import type { Metadata } from "next";
import { withDefaults } from "@/config/homeDefaults";
import { getHomeOverrides } from "@/libs/api/site";
import AdminLoginPage from "../../(pages)/Admin/AdminLoginPage";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLogin() {
  const { signin } = withDefaults(await getHomeOverrides());
  return <AdminLoginPage image={signin.admin} />;
}
