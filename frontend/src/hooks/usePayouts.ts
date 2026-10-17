"use client";

import useSWR from "swr";
import { fetchMyPayoutAccount, fetchMyStatements, fetchPayouts, fetchStatement } from "@/libs/api/payouts";
import { useAuthStore } from "@/stores/auth";

export const usePayouts = (month: string) => {
  const { data, error, isLoading, mutate } = useSWR(["admin/payouts", month], () => fetchPayouts(month));
  return { rows: data?.venues ?? [], error, isLoading, mutate };
};

export const useStatement = (id: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(id ? ["admin/statement", id] : null, () => fetchStatement(id!));
  return { statement: data, error, isLoading, mutate };
};

export const useMyPayoutAccount = () => {
  const accountId = useAuthStore("partner", (state) => state.account?.id);
  const { data, error, isLoading } = useSWR(accountId ? ["partner/payout-account", accountId] : null, fetchMyPayoutAccount);
  return { payoutAccount: data ?? null, error, isLoading: isLoading || !accountId };
};

export const useMyStatements = () => {
  const accountId = useAuthStore("partner", (state) => state.account?.id);
  const statements = useSWR(accountId ? ["partner/statements", accountId] : null, fetchMyStatements);
  const account = useSWR(accountId ? ["partner/payout-account", accountId] : null, fetchMyPayoutAccount);
  return {
    statements: statements.data ?? [],
    payoutAccount: account.data ?? null,
    error: statements.error,
    isLoading: statements.isLoading || !accountId,
  };
};
