import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import SeatSelectionPage from "../../../../(pages)/Booking/SeatSelectionPage";
import { getVenue } from "@/libs/api/venues";

type SeatsRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: SeatsRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenue(slug);

  if (!venue) return { title: "Workspace not found" };

  return { title: `Select a seat at ${venue.name}` };
}

export default async function SeatsRoute({ params }: SeatsRouteProps) {
  // Rendered per request so an unreachable API reaches app/error.tsx; the fetches stay cached.
  await connection();
  const { slug } = await params;
  const venue = await getVenue(slug);

  if (!venue) notFound();

  // The page reads ?taken= after a seat was lost at payment, which needs a boundary.
  return (
    <Suspense fallback={null}>
      <SeatSelectionPage venue={venue} />
    </Suspense>
  );
}
