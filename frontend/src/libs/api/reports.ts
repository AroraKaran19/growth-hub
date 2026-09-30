"use client";

import type { Report, ReportName, ReportQuery } from "@/types/report";
import { adminApi, partnerApi } from "./client";
import { downloadCsv } from "./payouts";

type Envelope<T> = { data: { data: T } };

const params = (query: ReportQuery) => ({ from: query.from, to: query.to, ...(query.venue && { venue: query.venue }) });

export const fetchReport = async (name: ReportName, query: ReportQuery) =>
  ((await adminApi.get(`/admin/reports/${name}`, { params: params(query) })) as Envelope<{ report: Report }>).data.data.report;

export const downloadReport = (name: ReportName, query: ReportQuery) => {
  const search = new URLSearchParams(params(query)).toString();
  return downloadCsv(adminApi, `/admin/reports/${name}/export.csv?${search}`, `${name}-${query.from}-to-${query.to}.csv`);
};

export type SalesSummary = {
  month: string;
  monthLabel: string;
  payable: number;
  items: number;
  upcomingVisits: number;
  openRequests: number;
};

export const fetchSalesSummary = async () =>
  ((await partnerApi.get("/partner/sales-summary")) as Envelope<{ summary: SalesSummary }>).data.data.summary;
