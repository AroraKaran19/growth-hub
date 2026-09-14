import type { Metadata } from "next";
import AdminLoginPage from "../../(pages)/Admin/AdminLoginPage";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLogin() {
  return <AdminLoginPage />;
}
