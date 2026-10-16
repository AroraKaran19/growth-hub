"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Building2, Pencil, Plus } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { GST_REGISTERED, ISSUER_NAME } from "@/config/invoice";
import { gstStateName } from "@/data/gstStates";
import { memberApi } from "@/libs/api/client";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { useAuthStore } from "@/stores/auth";
import type { MemberAccount } from "@/types/auth";
import { cn } from "@/utils";
import { gstinStateCode, isValidGstin, tidyGstin } from "@/utils/gstin";
import {
  billingErrorsFromApi,
  hasBilling,
  isSameBilling,
  toBillingBody,
  toBillingDraft,
  validateBilling,
  type BillingDraft,
  type BillingErrors,
} from "../billingDraft";

const FIELD_BOX =
  "w-full rounded-lg border border-tertiary/20 bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const FIELD_LABEL = "mb-1.5 block text-sm font-medium text-tertiary";
const SECONDARY_BUTTON =
  "inline-flex items-center gap-2 rounded-lg border border-tertiary/15 bg-secondary px-3.5 py-2 text-sm font-medium text-tertiary shadow-sm transition-all hover:-translate-y-0.5 hover:border-tertiary/30 hover:shadow-md";

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} role="alert" className="mt-1.5 text-xs text-primary">
      {message}
    </p>
  ) : null;

const Detail = ({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) => (
  <div className={wide ? "sm:col-span-2" : undefined}>
    <dt className="text-xs text-tertiary/55">{label}</dt>
    <dd className="mt-1 text-sm font-medium text-tertiary">{children}</dd>
  </div>
);

type BillingDetailsCardProps = {
  account: MemberAccount;
  className?: string;
};

/** The company saved for this account; it prefills the company invoice form at checkout. */
const BillingDetailsCard = ({ account, className }: BillingDetailsCardProps) => {
  const setAccount = useAuthStore("member", (state) => state.setAccount);
  const [draft, setDraft] = useState<BillingDraft | null>(null);
  const [errors, setErrors] = useState<BillingErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = draft !== null;
  const isSaved = hasBilling(account);
  const savedDraft = toBillingDraft(account);
  const typedGstin = draft ? tidyGstin(draft.gstin) : "";
  const gstinState = isValidGstin(typedGstin) ? gstStateName(gstinStateCode(typedGstin)) : "";
  const invoiceEmail = account.profile?.billingEmail ?? account.email;

  const startEditing = () => {
    setDraft(savedDraft);
    setErrors({});
  };

  const stopEditing = () => {
    setDraft(null);
    setErrors({});
  };

  const change = (key: keyof BillingDraft, next: string) => {
    setDraft((current) => {
      if (!current) return current;
      const updated = { ...current, [key]: next };
      const gstin = tidyGstin(updated.gstin);
      // A GSTIN names its state, so it is filled in rather than picked.
      if (key === "gstin") updated.state = isValidGstin(gstin) ? gstinStateCode(gstin) : "";
      return updated;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const send = async (billing: BillingDraft | null, done: string) => {
    setIsSaving(true);
    try {
      const { data } = await memberApi.patch("/members/me", { billing });
      setAccount(data.data.account as MemberAccount);
      stopEditing();
      toastDone(done);
    } catch (caught) {
      const info = readApiError(caught);
      const mapped = billingErrorsFromApi(info);
      setErrors(mapped);
      toastFailed(Object.keys(mapped).length > 0 ? "Check the highlighted fields." : info.message);
    } finally {
      setIsSaving(false);
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const found = validateBilling(draft);
    if (!draft.companyName.trim()) found.companyName = "Enter the company name.";
    if (!tidyGstin(draft.gstin)) found.gstin = "Enter the company's GSTIN.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (isSameBilling(draft, account)) return stopEditing();
    void send(toBillingBody(draft), "Company details saved.");
  };

  return (
    <section
      aria-labelledby="billing-details-title"
      className={cn("rounded-2xl border border-tertiary/10 bg-secondary shadow-md shadow-tertiary/5", className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-tertiary/8 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
            <Building2 aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 id="billing-details-title" className="text-base font-bold text-tertiary">
              Saved company
            </h2>
            <p className="text-sm text-tertiary/60">Fills in the company form when you ask for a GST invoice.</p>
          </div>
        </div>
        {!isEditing && isSaved && (
          <button type="button" onClick={startEditing} className={SECONDARY_BUTTON}>
            <Pencil aria-hidden="true" className="size-3.5" />
            Edit
          </button>
        )}
      </header>

      {draft ? (
        <form onSubmit={save} noValidate className="px-5 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div>
              <label htmlFor="billing-companyName" className={FIELD_LABEL}>
                Company name
                <RequiredMark />
              </label>
              <input
                id="billing-companyName"
                type="text"
                autoComplete="organization"
                value={draft.companyName}
                placeholder="As registered for GST"
                aria-required="true"
                aria-invalid={Boolean(errors.companyName)}
                aria-describedby={errors.companyName ? "billing-companyName-error" : undefined}
                onChange={(event) => change("companyName", event.target.value)}
                className={cn(FIELD_BOX, errors.companyName && "border-primary")}
              />
              <FieldError id="billing-companyName-error" message={errors.companyName} />
            </div>

            <div>
              <label htmlFor="billing-gstin" className={FIELD_LABEL}>
                GSTIN
                <RequiredMark />
              </label>
              <div className="relative">
                <input
                  id="billing-gstin"
                  type="text"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={18}
                  value={draft.gstin}
                  placeholder="15-character GSTIN"
                  aria-required="true"
                  aria-invalid={Boolean(errors.gstin)}
                  aria-describedby={errors.gstin ? "billing-gstin-error" : undefined}
                  onChange={(event) => change("gstin", event.target.value.toUpperCase())}
                  className={cn(FIELD_BOX, "font-mono tracking-wide", gstinState && "pr-28", errors.gstin && "border-primary")}
                />
                {gstinState && (
                  <span className="pointer-events-none absolute right-2.5 top-1/2 max-w-24 -translate-y-1/2 truncate rounded-full bg-green-500/12 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {gstinState}
                  </span>
                )}
              </div>
              <FieldError id="billing-gstin-error" message={errors.gstin ?? errors.state} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="billing-address" className={FIELD_LABEL}>
                Billing address
                <span className="ml-1.5 font-normal text-tertiary/45">(optional)</span>
              </label>
              <textarea
                id="billing-address"
                rows={2}
                autoComplete="street-address"
                value={draft.address}
                placeholder="Building, street, city and PIN code"
                aria-invalid={Boolean(errors.address)}
                aria-describedby={errors.address ? "billing-address-error" : undefined}
                onChange={(event) => change("address", event.target.value)}
                className={cn(FIELD_BOX, "resize-none", errors.address && "border-primary")}
              />
              <FieldError id="billing-address-error" message={errors.address} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {isSaved ? (
              <button
                type="button"
                onClick={() => void send(null, "Saved company removed.")}
                disabled={isSaving}
                className="text-sm font-medium text-tertiary/55 transition-colors hover:text-primary disabled:opacity-50"
              >
                Remove saved company
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={stopEditing}
                disabled={isSaving}
                className="text-sm font-medium text-tertiary/65 transition-colors hover:text-tertiary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-medium text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save company"}
              </button>
            </div>
          </div>
        </form>
      ) : isSaved ? (
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
          <Detail label="Company name">{savedDraft.companyName || "Not added"}</Detail>
          <Detail label="GSTIN">
            <span className="font-mono tracking-wide">{savedDraft.gstin || "Not added"}</span>
          </Detail>
          <Detail label="State">
            {savedDraft.state ? `${gstStateName(savedDraft.state)} (${savedDraft.state})` : "Not added"}
          </Detail>
          {invoiceEmail && <Detail label="Invoices emailed to">{invoiceEmail}</Detail>}
          {savedDraft.address && (
            <Detail label="Billing address" wide>
              <span className="whitespace-pre-line font-normal">{savedDraft.address}</span>
            </Detail>
          )}
        </dl>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <p className="text-sm text-tertiary/65">
            No company saved. Invoices go to <span className="font-medium text-tertiary">{account.name ?? "you"}</span>.
          </p>
          <button
            type="button"
            onClick={startEditing}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add company
          </button>
        </div>
      )}

      <p className="rounded-b-2xl border-t border-tertiary/8 bg-surface px-5 py-3 text-xs leading-relaxed text-tertiary/55 sm:px-6">
        Invoices already issued keep the details they were issued with.
        {!GST_REGISTERED && ` ${ISSUER_NAME} isn't registered under GST yet, so invoices carry no GST for now.`}
      </p>
    </section>
  );
};

export default BillingDetailsCard;
