import type { ReactNode } from "react";
import type { Metadata } from "next";
import AdminShell from "../../(pages)/Admin/components/AdminShell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
