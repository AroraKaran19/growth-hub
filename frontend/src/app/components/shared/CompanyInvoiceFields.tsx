"use client";

import { useId } from "react";
import { Building2, Info } from "lucide-react";
import Toggle from "@/app/(pages)/Admin/components/Toggle";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { ISSUER_STATE_CODE } from "@/config/invoice";
import { gstStateName } from "@/data/gstStates";
import { cn } from "@/utils";
import type { CompanyInvoiceDraft, CompanyInvoiceErrors } from "@/utils/companyInvoice";
import { gstinStateCode, isValidGstin, tidyGstin } from "@/utils/gstin";

const FIELD_BOX =
  "w-full rounded-lg border border-tertiary/20 bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const FIELD_LABEL = "mb-1.5 block text-sm font-medium text-tertiary";

type CompanyInvoiceFieldsProps = {
  draft: CompanyInvoiceDraft;
  errors: CompanyInvoiceErrors;
  onChange: (next: CompanyInvoiceDraft) => void;
  /** Purchases by a guest can't save details yet. */
  canSave?: boolean;
  className?: string;
};

/** Asks whether this purchase should be invoiced to a company, and to which one. */
const CompanyInvoiceFields = ({ draft, errors, onChange, canSave = true, className }: CompanyInvoiceFieldsProps) => {
  const id = useId();
  const gstin = tidyGstin(draft.gstin);
  const stateCode = isValidGstin(gstin) ? gstinStateCode(gstin) : "";
  const set = (patch: Partial<CompanyInvoiceDraft>) => onChange({ ...draft, ...patch });
  const errorId = (key: keyof CompanyInvoiceErrors) => (errors[key] ? `${id}-${key}-error` : undefined);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        draft.forCompany ? "border-primary/30 bg-primary/3" : "border-tertiary/10 bg-surface",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary shadow-sm">
            <Building2 aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 id={`${id}-title`} className="text-sm font-semibold text-tertiary">
              Need a GST invoice for a company?
            </h3>
            <p className="mt-0.5 text-xs text-tertiary/55">Otherwise the invoice is in your own name.</p>
          </div>
        </div>
        <Toggle
          checked={draft.forCompany}
          onChange={(forCompany) => set({ forCompany })}
          label="Invoice a company"
          hideLabel
        />
      </div>

      {draft.forCompany && (
        <div className="animate-[fade-up_0.2s_ease-out_both] border-t border-tertiary/8 bg-secondary px-4 py-4 motion-reduce:animate-none">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-company`} className={FIELD_LABEL}>
                Company name
                <RequiredMark />
              </label>
              <input
                id={`${id}-company`}
                type="text"
                autoComplete="organization"
                value={draft.companyName}
                placeholder="As registered for GST"
                aria-required="true"
                aria-invalid={Boolean(errors.companyName)}
                aria-describedby={errorId("companyName")}
                onChange={(event) => set({ companyName: event.target.value })}
                className={cn(FIELD_BOX, errors.companyName && "border-primary")}
              />
              {errors.companyName && (
                <p id={`${id}-companyName-error`} role="alert" className="mt-1.5 text-xs text-primary">
                  {errors.companyName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={`${id}-gstin`} className={FIELD_LABEL}>
                GSTIN
                <RequiredMark />
              </label>
              <div className="relative">
                <input
                  id={`${id}-gstin`}
                  type="text"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={18}
                  value={draft.gstin}
                  placeholder="15-character GSTIN"
                  aria-required="true"
                  aria-invalid={Boolean(errors.gstin)}
                  aria-describedby={errorId("gstin")}
                  onChange={(event) => set({ gstin: event.target.value.toUpperCase() })}
                  className={cn(FIELD_BOX, "font-mono tracking-wide", stateCode && "pr-28", errors.gstin && "border-primary")}
                />
                {stateCode && (
                  <span className="pointer-events-none absolute right-2.5 top-1/2 max-w-24 -translate-y-1/2 truncate rounded-full bg-green-500/12 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {gstStateName(stateCode)}
                  </span>
                )}
              </div>
              {errors.gstin && (
                <p id={`${id}-gstin-error`} role="alert" className="mt-1.5 text-xs text-primary">
                  {errors.gstin}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor={`${id}-address`} className={FIELD_LABEL}>
                Billing address
                <span className="ml-1.5 font-normal text-tertiary/45">(optional)</span>
              </label>
              <textarea
                id={`${id}-address`}
                rows={2}
                autoComplete="street-address"
                value={draft.address}
                placeholder="Building, street, city and PIN code"
                aria-invalid={Boolean(errors.address)}
                aria-describedby={errorId("address")}
                onChange={(event) => set({ address: event.target.value })}
                className={cn(FIELD_BOX, "resize-none", errors.address && "border-primary")}
              />
              {errors.address && (
                <p id={`${id}-address-error`} role="alert" className="mt-1.5 text-xs text-primary">
                  {errors.address}
                </p>
              )}
            </div>
          </div>

          {stateCode && stateCode !== ISSUER_STATE_CODE && (
            <p className="mt-3 flex gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900">
              <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              GST on a workspace is charged in the state the venue is in, so a GSTIN from {gstStateName(stateCode)} usually
              can&apos;t claim this credit.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {canSave ? (
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-tertiary/75">
                <input
                  type="checkbox"
                  checked={draft.save}
                  onChange={(event) => set({ save: event.target.checked })}
                  className="size-4 accent-primary"
                />
                Save these details for next time
              </label>
            ) : (
              <span />
            )}
            <p className="text-xs text-tertiary/50">An issued invoice can&apos;t be changed, so choose this before you pay.</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default CompanyInvoiceFields;
