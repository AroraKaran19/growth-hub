import type { Metadata } from "next";
import InvoicesPage from "../../(pages)/Account/InvoicesPage";

export const metadata: Metadata = {
  title: "Invoices",
  robots: { index: false, follow: false },
};

export default function Invoices() {
  return <InvoicesPage />;
}
