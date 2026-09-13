import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VenuePage from "../../(pages)/Venue/VenuePage";
import { VENUES } from "@/data/venues";

type VenueRouteProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return VENUES.map((venue) => ({ slug: venue.slug }));
}

export async function generateMetadata({
  params,
}: VenueRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = VENUES.find((item) => item.slug === slug);

  if (!venue) return { title: "Workspace not found" };

  return {
    title: `${venue.name}, ${venue.locality}`,
    description: venue.description,
  };
}

export default async function VenueRoute({ params }: VenueRouteProps) {
  const { slug } = await params;
  const venue = VENUES.find((item) => item.slug === slug);

  if (!venue) notFound();

  return <VenuePage venue={venue} />;
}
