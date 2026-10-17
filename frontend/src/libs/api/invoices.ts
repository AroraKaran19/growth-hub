"use client";

import type { AdminInvoice, MemberInvoice } from "@/types/invoice";
import { readApiError } from "./errors";
import { adminApi, memberApi } from "./client";
import { toastFailed } from "../toast";

type Envelope<T> = { data: { data: T } };

const data = async <T>(request: Promise<unknown>) => ((await request) as Envelope<T>).data.data;

export const fetchMyInvoices = async () => (await data<{ invoices: MemberInvoice[] }>(memberApi.get("/invoices"))).invoices;

export const fetchAdminInvoices = async ([, status]: [string, string]) =>
  (await data<{ invoices: AdminInvoice[] }>(adminApi.get("/admin/invoices", { params: status ? { status } : undefined }))).invoices;

export const retryInvoice = (id: string) => data<{ queued: boolean }>(adminApi.post(`/admin/invoices/${id}/retry`));

export type InvoiceBundleSummary = { from: string; to: string; ready: number; notReady: number; limit: number };

export const fetchInvoiceBundleSummary = (from: string, to: string) =>
  data<InvoiceBundleSummary>(adminApi.get("/admin/invoices/bundle/summary", { params: { from, to } }));

/** Saves a zip of the ready invoices issued in the range. */
export const downloadInvoiceBundle = async (from: string, to: string) => {
  const response = await adminApi.get("/admin/invoices/bundle.zip", { params: { from, to }, responseType: "blob" });
  const disposition = String(response.headers["content-disposition"] ?? "");
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `Growth Hub invoices ${from}.zip`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(response.data as Blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
};

/** Opens an invoice PDF in a new tab for admins; the tab opens first so popup blockers allow it. */
const openAdminPdf = async (path: string) => {
  const tab = window.open("", "_blank");
  try {
    const { url } = await data<{ url: string }>(adminApi.get(path));
    if (tab) tab.location.href = url;
    else window.location.assign(url);
  } catch (caught) {
    tab?.close();
    toastFailed(readApiError(caught).message);
  }
};

export const viewAdminInvoice = (id: string) => openAdminPdf(`/admin/invoices/${id}/view`);

/** The same, scoped to one customer's invoices from the Manage users popup. */
export const viewCustomerInvoice = (customerId: string, invoiceId: string) =>
  openAdminPdf(`/admin/users/customers/${customerId}/invoices/${invoiceId}/view`);

/** Opens a short-lived link; a not-ready invoice explains itself in a toast. */
export const downloadInvoice = async (id: string) => {
  try {
    const { url } = await data<{ url: string }>(memberApi.get(`/invoices/${id}/download`));
    window.location.assign(url);
  } catch (caught) {
    toastFailed(readApiError(caught).message);
  }
};
