import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingPage from "../../../(pages)/Booking/BookingPage";
import { VENUES } from "@/data/venues";

type BookRouteProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return VENUES.map((venue) => ({ slug: venue.slug }));
}

export async function generateMetadata({
  params,
}: BookRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = VENUES.find((item) => item.slug === slug);

  if (!venue) return { title: "Workspace not found" };

  return { title: `Book ${venue.name}` };
}

export default async function BookRoute({ params }: BookRouteProps) {
  const { slug } = await params;
  const venue = VENUES.find((item) => item.slug === slug);

  if (!venue) notFound();

  return <BookingPage venue={venue} />;
}
