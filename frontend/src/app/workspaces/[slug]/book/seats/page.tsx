import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeatSelectionPage from "../../../../(pages)/Booking/SeatSelectionPage";
import { VENUES } from "@/data/venues";

type SeatsRouteProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return VENUES.map((venue) => ({ slug: venue.slug }));
}

export async function generateMetadata({
  params,
}: SeatsRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = VENUES.find((item) => item.slug === slug);

  if (!venue) return { title: "Workspace not found" };

  return { title: `Select a seat at ${venue.name}` };
}

export default async function SeatsRoute({ params }: SeatsRouteProps) {
  const { slug } = await params;
  const venue = VENUES.find((item) => item.slug === slug);

  if (!venue) notFound();

  return <SeatSelectionPage venue={venue} />;
}
