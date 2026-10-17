"use client";

import useSWR from "swr";
import { adminApi } from "@/libs/api/client";
import type { ApiBookingStatus } from "@/types/apiBooking";
import type { PassType } from "@/types/booking";
import type { InvoiceKind } from "@/types/invoice";
import type { MembershipStatus } from "@/types/membership";

export type CustomerBooking = {
  ref: string;
  status: ApiBookingStatus;
  venueName: string;
  date: string;
  timeLabel: string;
  seats: string[];
  passType: PassType;
  amount: number;
  invoiceId: string | null;
  invoiceReady: boolean;
};

export type CustomerMembership = {
  ref: string;
  status: MembershipStatus;
  venueName: string;
  planName: string | null;
  spaceType: string;
  length: string;
  seats: string[];
  startDate: string;
  paidThrough: string | null;
  cyclePrice: number;
};

export type CustomerInvoice = {
  id: string;
  number: string;
  kind: InvoiceKind;
  reference: string;
  description: string;
  date: string;
  total: number;
  status: "ready" | "preparing" | "failed";
  emailed: boolean;
};

export type CustomerRecords = {
  bookings: CustomerBooking;
  memberships: CustomerMembership;
  invoices: CustomerInvoice;
};

export type RecordKind = keyof CustomerRecords;

export type RecordsPage<T> = { items: T[]; page: number; pageSize: number; total: number };

const fetchRecords = async ([, id, kind, page]: [string, string, RecordKind, number]) =>
  (await adminApi.get<{ data: RecordsPage<unknown> }>(`/admin/users/customers/${id}/${kind}`, { params: { page } })).data.data;

export const useCustomerRecords = <K extends RecordKind>(id: string, kind: K, page: number) => {
  const key: [string, string, RecordKind, number] = ["admin/customer-records", id, kind, page];
  const { data, error, isLoading, isValidating } = useSWR(key, fetchRecords, { keepPreviousData: true });
  return { data: data as RecordsPage<CustomerRecords[K]> | undefined, error: error as unknown, isLoading, isValidating };
};
