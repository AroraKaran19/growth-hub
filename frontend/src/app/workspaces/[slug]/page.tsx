import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import VenuePage from "../../(pages)/Venue/VenuePage";
import { getPublishedVenues, getVenue } from "@/libs/api/venues";

type VenueRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: VenueRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenue(slug);

  if (!venue) return { title: "Workspace not found" };

  return {
    title: `${venue.name}, ${venue.locality}`,
    description: venue.description,
  };
}

export default async function VenueRoute({ params }: VenueRouteProps) {
  // Rendered per request so an unreachable API reaches app/error.tsx; the fetches stay cached.
  await connection();
  const { slug } = await params;
  const [venue, published] = await Promise.all([
    getVenue(slug),
    getPublishedVenues(),
  ]);

  if (!venue) notFound();

  return (
    <VenuePage
      venue={venue}
      others={published.filter((item) => item.id !== venue.id)}
    />
  );
}
