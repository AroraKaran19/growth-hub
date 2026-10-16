import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import VenuePage from "../../(pages)/Venue/VenuePage";
import { getPublishedVenues, getVenue } from "@/libs/api/venues";
import { loadSeo, sharedOpenGraph } from "@/libs/seo";

type VenueRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: VenueRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const [venue, { seo }] = await Promise.all([getVenue(slug), loadSeo()]);

  if (!venue) return { title: "Workspace not found" };

  const title = `${venue.name}, ${venue.locality}`;
  return {
    title,
    description: venue.description,
    alternates: { canonical: `/workspaces/${venue.slug}` },
    openGraph: {
      ...sharedOpenGraph(seo),
      title,
      description: venue.description,
      url: `/workspaces/${venue.slug}`,
      // The venue's own cover beats the site-wide share image when it has one.
      ...(venue.image && { images: [{ url: venue.image, alt: venue.name }] }),
    },
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
