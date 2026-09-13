import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PaymentPage from "../../../../(pages)/Booking/PaymentPage";
import { VENUES } from "@/data/venues";

type PaymentRouteProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return VENUES.map((venue) => ({ slug: venue.slug }));
}

export async function generateMetadata({
  params,
}: PaymentRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = VENUES.find((item) => item.slug === slug);

  if (!venue) return { title: "Workspace not found" };

  return { title: `Payment for ${venue.name}` };
}

export default async function PaymentRoute({ params }: PaymentRouteProps) {
  const { slug } = await params;
  const venue = VENUES.find((item) => item.slug === slug);

  if (!venue) notFound();

  return <PaymentPage venue={venue} />;
}
