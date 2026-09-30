import type { Metadata } from "next";
import InvoicePage from "../../(pages)/Invoice/InvoicePage";
import RequireSession from "../../components/shared/RequireSession";

type InvoiceRouteProps = {
  params: Promise<{ bookingId: string }>;
};

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

export default async function InvoiceRoute({ params }: InvoiceRouteProps) {
  const { bookingId } = await params;
  // The booking is fetched in the browser with the member's own token, never baked into the page.
  return (
    <RequireSession>
      <InvoicePage bookingId={bookingId} />
    </RequireSession>
  );
}
