"use client";

import { useState } from "react";
import { Building2, Info, Pencil, Plus } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { GST_REGISTERED, ISSUER_NAME } from "@/config/invoice";
import { GST_STATE_OPTIONS, gstStateName } from "@/data/gstStates";
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
const FIELD_HINT = "mt-1.5 text-xs text-tertiary/55";

const STATE_OPTIONS = [{ label: "Not added", value: "" }, ...GST_STATE_OPTIONS];

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} role="alert" className="mt-1.5 text-xs text-primary">
      {message}
    </p>
  ) : null;

const BilledToPreview = ({ account }: { account: MemberAccount }) => {
  const billing = toBillingDraft(account);
  const state = gstStateName(billing.state);
  const email = account.profile?.billingEmail ?? account.email;

  return (
    <div className="relative overflow-hidden rounded-xl border border-t-[3px] border-tertiary/10 border-t-primary bg-secondary p-5 shadow-lg shadow-tertiary/8">
      <p className="text-xs font-semibold text-tertiary/50">Billed to</p>
      <p className="mt-2 text-base font-bold text-tertiary">
        {billing.companyName || account.name || "Your name"}
      </p>
      {billing.gstin && (
        <p className="mt-1 text-sm text-tertiary/75">
          GSTIN <span className="font-mono tracking-wide text-tertiary">{billing.gstin}</span>
        </p>
      )}
      {billing.address && (
        <p className="mt-1 whitespace-pre-line text-sm text-tertiary/65">{billing.address}</p>
      )}
      {state && (
        <p className="text-sm text-tertiary/65">
          {state} ({billing.state})
        </p>
      )}
      {email && <p className="mt-1 text-sm text-tertiary/65">{email}</p>}
    </div>
  );
};

type BillingDetailsCardProps = {
  account: MemberAccount;
  onSaved?: (account: MemberAccount) => void;
  className?: string;
};

/** Optional company details copied onto each invoice when it is issued. */
const BillingDetailsCard = ({ account, onSaved, className }: BillingDetailsCardProps) => {
  const setAccount = useAuthStore("member", (state) => state.setAccount);
  const [draft, setDraft] = useState<BillingDraft | null>(null);
  const [errors, setErrors] = useState<BillingErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = draft !== null;
  const saved = hasBilling(account);
  const typedGstin = draft ? tidyGstin(draft.gstin) : "";
  const gstinState = isValidGstin(typedGstin) ? gstStateName(gstinStateCode(typedGstin)) : "";

  const startEditing = () => {
    setDraft(toBillingDraft(account));
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
      // A GSTIN names its state, so fill it in rather than risk a mismatch.
      if (key === "gstin" && isValidGstin(gstin)) updated.state = gstinStateCode(gstin);
      return updated;
    });
    setErrors((current) => ({ ...current, [key]: undefined, ...(key === "gstin" && { state: undefined }) }));
  };

  const send = async (billing: BillingDraft | null, done: string) => {
    setIsSaving(true);
    try {
      const { data } = await memberApi.patch("/members/me", { billing });
      const next = data.data.account as MemberAccount;
      setAccount(next);
      onSaved?.(next);
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

  const save = () => {
    if (!draft) return;
    const found = validateBilling(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toastFailed("Check the highlighted fields.");
      return;
    }
    if (isSameBilling(draft, account)) {
      stopEditing();
      return;
    }
    void send(toBillingBody(draft), "Billing details saved.");
  };

  const describedBy = (key: keyof BillingDraft, hint?: boolean) =>
    errors[key] ? `billing-${key}-error` : hint ? `billing-${key}-hint` : undefined;

  return (
    <section
      aria-labelledby="billing-details-title"
      className={cn(
        "overflow-hidden rounded-2xl border border-tertiary/10 bg-secondary shadow-xl shadow-tertiary/5",
        className,
      )}
    >
      <div className={cn("relative overflow-hidden bg-tertiary px-5 py-5 text-secondary lg:px-6", !isEditing && "lg:pb-14")}>
        <div aria-hidden="true" className="cta-banner absolute -right-12 -top-16 size-44 rounded-full opacity-30 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="bg-icon-tile flex size-11 shrink-0 items-center justify-center rounded-xl text-secondary shadow-lg shadow-primary/30">
              <Building2 aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 id="billing-details-title" className="text-lg font-bold">
                Billing Details
              </h2>
              <p className="mt-0.5 max-w-md text-sm text-secondary/70">
                Optional. Add your company and GSTIN to have invoices issued in its name.
              </p>
            </div>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-2 rounded-lg bg-secondary/10 px-3.5 py-2 text-sm font-medium text-secondary ring-1 ring-secondary/20 transition-colors hover:bg-secondary/15"
            >
              {saved ? <Pencil aria-hidden="true" className="size-3.5" /> : <Plus aria-hidden="true" className="size-4" />}
              {saved ? "Edit" : "Add details"}
            </button>
          )}
        </div>
      </div>

      {draft ? (
        <div className="p-5 lg:p-6">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="billing-companyName" className={FIELD_LABEL}>
                Company Name
              </label>
              <input
                id="billing-companyName"
                type="text"
                autoComplete="organization"
                value={draft.companyName}
                placeholder="Company name as registered"
                aria-invalid={Boolean(errors.companyName)}
                aria-describedby={describedBy("companyName", true)}
                onChange={(event) => change("companyName", event.target.value)}
                className={cn(FIELD_BOX, errors.companyName && "border-primary")}
              />
              {errors.companyName ? (
                <FieldError id="billing-companyName-error" message={errors.companyName} />
              ) : (
                <p id="billing-companyName-hint" className={FIELD_HINT}>
                  Leave it blank to have invoices in your own name.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="billing-gstin" className={FIELD_LABEL}>
                GSTIN
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
                  aria-invalid={Boolean(errors.gstin)}
                  aria-describedby={describedBy("gstin", true)}
                  onChange={(event) => change("gstin", event.target.value.toUpperCase())}
                  className={cn(FIELD_BOX, "font-mono tracking-wide", gstinState && "pr-28", errors.gstin && "border-primary")}
                />
                {gstinState && (
                  <span className="pointer-events-none absolute right-2.5 top-1/2 max-w-24 -translate-y-1/2 truncate rounded-full bg-green-500/12 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {gstinState}
                  </span>
                )}
              </div>
              {errors.gstin ? (
                <FieldError id="billing-gstin-error" message={errors.gstin} />
              ) : (
                <p id="billing-gstin-hint" className={FIELD_HINT}>
                  The state fills in from your GSTIN.
                </p>
              )}
            </div>

            <div>
              <SelectField
                label="State"
                value={draft.state}
                options={STATE_OPTIONS}
                placeholder="Select state"
                onChange={(next) => change("state", next)}
              />
              <FieldError id="billing-state-error" message={errors.state} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="billing-address" className={FIELD_LABEL}>
                Billing Address
              </label>
              <textarea
                id="billing-address"
                rows={3}
                autoComplete="street-address"
                value={draft.address}
                placeholder="Building, street, city and PIN code"
                aria-invalid={Boolean(errors.address)}
                aria-describedby={describedBy("address")}
                onChange={(event) => change("address", event.target.value)}
                className={cn(FIELD_BOX, "resize-none", errors.address && "border-primary")}
              />
              <FieldError id="billing-address-error" message={errors.address} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-tertiary/10 pt-5">
            {saved ? (
              <button
                type="button"
                onClick={() => void send(null, "Billing details removed.")}
                disabled={isSaving}
                className="text-sm font-medium text-tertiary/55 transition-colors hover:text-primary disabled:opacity-50"
              >
                Remove billing details
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
                type="button"
                onClick={save}
                disabled={isSaving}
                className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-medium text-secondary shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save billing details"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:gap-8 lg:p-6">
          <div className="lg:-mt-10">
            <BilledToPreview account={account} />
          </div>
          <div className="flex flex-col gap-3 text-sm text-tertiary/65">
            <p className="flex gap-2.5">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Each invoice keeps the details it was issued with. Changes here apply to invoices from now on.
              </span>
            </p>
            {!GST_REGISTERED && (
              <p className="rounded-lg bg-surface px-3.5 py-2.5 text-xs leading-relaxed text-tertiary/60">
                {ISSUER_NAME} is not registered under GST yet, so invoices carry no GST and can&apos;t be used to
                claim input tax credit.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default BillingDetailsCard;
