import type { ReactNode } from "react";
import type { Metadata } from "next";
import PartnerShell from "../../(pages)/Partner/components/PartnerShell";

export const metadata: Metadata = {
  title: { default: "Partner dashboard", template: "%s | Partner dashboard" },
  robots: { index: false, follow: false },
};

export default function PartnerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PartnerShell>{children}</PartnerShell>;
}
