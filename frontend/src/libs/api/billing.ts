"use client";

import { authStoreFor } from "@/stores/auth";
import type { MemberAccount } from "@/types/auth";
import { savedBillingUpdate, type CompanyInvoiceDraft } from "@/utils/companyInvoice";
import { memberApi } from "./client";

/** Keeps the Billing page in step with a purchase when "save for next time" is ticked; never blocks checkout. */
export const rememberCompanyDetails = async (draft: CompanyInvoiceDraft) => {
  const store = authStoreFor("member").getState();
  const billing = savedBillingUpdate(draft, store.account?.billing);
  if (!billing) return;
  try {
    const { data } = await memberApi.patch("/members/me", { billing });
    store.setAccount(data.data.account as MemberAccount);
  } catch {
    // The purchase already carries its own copy; the saved details can be fixed on the Billing page.
  }
};
