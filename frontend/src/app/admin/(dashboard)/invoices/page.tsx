import type { Metadata } from "next";
import AdminInvoicesPage from "../../../(pages)/Admin/AdminInvoicesPage";

export const metadata: Metadata = {
  title: "Invoices",
};

export default function AdminInvoices() {
  return <AdminInvoicesPage />;
}
