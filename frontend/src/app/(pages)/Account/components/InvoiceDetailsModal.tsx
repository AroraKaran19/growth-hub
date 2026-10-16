"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import CompanyInvoiceFields from "@/app/components/shared/CompanyInvoiceFields";
import { rememberCompanyDetails } from "@/libs/api/billing";
import { readApiError } from "@/libs/api/errors";
import { setMembershipBilling } from "@/libs/api/memberships";
import { toastDone } from "@/libs/toast";
import { useAuthStore } from "@/stores/auth";
import type { ApiMembership } from "@/types/membership";
import {
  EMPTY_COMPANY_INVOICE,
  billingInputFrom,
  validateCompanyInvoice,
  withSavedDetails,
  type CompanyInvoiceDraft,
  type CompanyInvoiceErrors,
} from "@/utils/companyInvoice";
import { formatDay } from "@/utils/date";

type InvoiceDetailsModalProps = {
  membership: ApiMembership;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
};

const draftFor = (membership: ApiMembership): CompanyInvoiceDraft =>
  membership.billing
    ? {
        ...EMPTY_COMPANY_INVOICE,
        forCompany: true,
        companyName: membership.billing.companyName ?? "",
        gstin: membership.billing.gstin ?? "",
        address: membership.billing.address ?? "",
      }
    : EMPTY_COMPANY_INVOICE;

/** Who a membership's next renewals are invoiced to. */
const InvoiceDetailsModal = ({ membership, onClose, onSaved }: InvoiceDetailsModalProps) => {
  const saved = useAuthStore("member", (state) => state.account?.billing);
  const [draft, setDraft] = useState(() => draftFor(membership));
  const [errors, setErrors] = useState<CompanyInvoiceErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const change = (next: CompanyInvoiceDraft) => {
    const filled = next.forCompany && !draft.forCompany ? withSavedDetails(next, saved) : next;
    setDraft(filled);
    if (Object.keys(errors).length > 0) setErrors(validateCompanyInvoice(filled));
  };

  const save = async () => {
    const found = validateCompanyInvoice(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setIsSaving(true);
    setFailure(null);
    try {
      await setMembershipBilling(membership.ref, billingInputFrom(draft));
      void rememberCompanyDetails(draft);
      await onSaved();
      toastDone("Invoice details saved for the next renewal.");
      onClose();
    } catch (caught) {
      setFailure(readApiError(caught).message);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tertiary/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-details-title"
        className="relative w-full max-w-xl rounded-2xl bg-secondary p-6 shadow-xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-tertiary/50 transition-colors hover:text-tertiary"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        <h2 id="invoice-details-title" className="text-xl font-bold text-tertiary">
          Invoice details
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-tertiary/65">
          For your plan at {membership.venue.name}. Changes apply from the next renewal
          {membership.renewsOn ? ` on ${formatDay(membership.renewsOn)}` : ""}; invoices already issued stay as they are.
        </p>

        <CompanyInvoiceFields draft={draft} errors={errors} onChange={change} className="mt-5" />

        {failure && (
          <p role="alert" className="mt-3 text-sm text-primary">
            {failure}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={isSaving}
            className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save invoice details"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsModal;
