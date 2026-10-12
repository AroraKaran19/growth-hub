import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import BookingPage from "../../../(pages)/Booking/BookingPage";
import { getVenue } from "@/libs/api/venues";

type BookRouteProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: BookRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenue(slug);

  if (!venue) return { title: "Workspace not found" };

  return { title: `Book ${venue.name}` };
}

export default async function BookRoute({ params, searchParams }: BookRouteProps) {
  // Rendered per request so an unreachable API reaches app/error.tsx; the fetches stay cached.
  await connection();
  const [{ slug }, { plan }] = await Promise.all([params, searchParams]);
  const venue = await getVenue(slug);

  if (!venue) notFound();

  return <BookingPage venue={venue} planId={typeof plan === "string" ? plan : undefined} />;
}
