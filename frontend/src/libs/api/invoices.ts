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

/** Opens a short-lived link; a not-ready invoice explains itself in a toast. */
export const downloadInvoice = async (id: string) => {
  try {
    const { url } = await data<{ url: string }>(memberApi.get(`/invoices/${id}/download`));
    window.location.assign(url);
  } catch (caught) {
    toastFailed(readApiError(caught).message);
  }
};
