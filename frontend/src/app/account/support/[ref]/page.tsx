import type { Metadata } from "next";
import SupportRequestDetailPage from "../../../(pages)/Account/SupportRequestDetailPage";

type SupportRequestRouteProps = {
  params: Promise<{ ref: string }>;
};

export const metadata: Metadata = {
  title: "Support request",
  robots: { index: false, follow: false },
};

export default async function SupportRequestRoute({ params }: SupportRequestRouteProps) {
  const { ref } = await params;
  return <SupportRequestDetailPage requestRef={ref} />;
}
