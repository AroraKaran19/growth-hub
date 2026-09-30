import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import PaymentPage from "../../../../(pages)/Booking/PaymentPage";
import { getVenue } from "@/libs/api/venues";

type PaymentRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PaymentRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenue(slug);

  if (!venue) return { title: "Workspace not found" };

  return { title: `Payment for ${venue.name}` };
}

export default async function PaymentRoute({ params }: PaymentRouteProps) {
  // Rendered per request so an unreachable API reaches app/error.tsx; the fetches stay cached.
  await connection();
  const { slug } = await params;
  const venue = await getVenue(slug);

  if (!venue) notFound();

  return <PaymentPage venue={venue} />;
}
