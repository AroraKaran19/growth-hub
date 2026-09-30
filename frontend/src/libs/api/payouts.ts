"use client";

import type { AxiosInstance } from "axios";
import type { PayoutAccount, PayoutAccountInput, PayoutRow, Statement } from "@/types/payout";
import { adminApi, partnerApi } from "./client";

type Envelope<T> = { data: { data: T } };

const data = async <T>(request: Promise<unknown>) => ((await request) as Envelope<T>).data.data;
const statementOf = async (request: Promise<unknown>) => (await data<{ statement: Statement }>(request)).statement;

export const fetchPayouts = (month: string) => data<{ month: string; venues: PayoutRow[] }>(adminApi.get("/admin/payouts", { params: { month } }));

export const generateStatements = (month: string, venueSlug?: string) =>
  data<{ statements: Statement[] }>(adminApi.post("/admin/payouts/generate", { month, ...(venueSlug && { venueSlug }) }));

export const fetchStatement = (id: string) => statementOf(adminApi.get(`/admin/payouts/${id}`));

export const addAdjustment = (id: string, body: { amount: number; note: string }) =>
  statementOf(adminApi.post(`/admin/payouts/${id}/adjustments`, body));

export const removeAdjustment = (id: string, index: number) => statementOf(adminApi.delete(`/admin/payouts/${id}/adjustments/${index}`));

export const issueStatement = (id: string) => statementOf(adminApi.post(`/admin/payouts/${id}/issue`));

export const unissueStatement = (id: string) => statementOf(adminApi.post(`/admin/payouts/${id}/unissue`));

export const markStatementPaid = (id: string, body: { utr: string; paidOn: string; note: string }) =>
  statementOf(adminApi.post(`/admin/payouts/${id}/mark-paid`, body));

export const fetchPayoutAccount = async (slug: string, reveal = false) =>
  (await data<{ account: PayoutAccount | null }>(adminApi.get(`/admin/venues/${slug}/payout-account`, { params: reveal ? { reveal: "true" } : {} })))
    .account;

export const savePayoutAccount = async (slug: string, body: PayoutAccountInput) =>
  (await data<{ account: PayoutAccount }>(adminApi.put(`/admin/venues/${slug}/payout-account`, body))).account;

export const fetchMyStatements = async () => (await data<{ statements: Statement[] }>(partnerApi.get("/partner/statements"))).statements;

export const fetchMyStatement = (id: string) => statementOf(partnerApi.get(`/partner/statements/${id}`));

export const fetchMyPayoutAccount = async () =>
  (await data<{ account: PayoutAccount | null }>(partnerApi.get("/partner/payout-account"))).account;

/** The export needs the signed-in token, so it is fetched and saved rather than linked. */
export const downloadCsv = async (client: AxiosInstance, path: string, filename: string) => {
  const response = await client.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const downloadStatement = (statement: Statement, as: "admin" | "partner") =>
  downloadCsv(
    as === "admin" ? adminApi : partnerApi,
    as === "admin" ? `/admin/payouts/${statement.id}/export.csv` : `/partner/statements/${statement.id}/export.csv`,
    `statement-${statement.venue.slug}-${statement.month}.csv`,
  );
