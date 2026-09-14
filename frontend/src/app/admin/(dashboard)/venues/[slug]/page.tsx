import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminVenueEditPage from "../../../../(pages)/Admin/AdminVenueEditPage";
import { VENUES } from "@/data/venues";

type AdminVenueRouteProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return VENUES.map((venue) => ({ slug: venue.slug }));
}

export async function generateMetadata({
  params,
}: AdminVenueRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = VENUES.find((item) => item.slug === slug);
  return { title: venue ? `Edit ${venue.name}` : "Venue not found" };
}

export default async function AdminVenueRoute({ params }: AdminVenueRouteProps) {
  const { slug } = await params;
  if (!VENUES.some((venue) => venue.slug === slug)) notFound();

  return <AdminVenueEditPage slug={slug} />;
}
