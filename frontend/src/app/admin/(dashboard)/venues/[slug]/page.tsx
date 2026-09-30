import type { Metadata } from "next";
import AdminVenueEditPage from "../../../../(pages)/Admin/AdminVenueEditPage";

type AdminVenueRouteProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Edit venue",
};

export default async function AdminVenueRoute({ params }: AdminVenueRouteProps) {
  const { slug } = await params;
  return <AdminVenueEditPage slug={slug} />;
}
