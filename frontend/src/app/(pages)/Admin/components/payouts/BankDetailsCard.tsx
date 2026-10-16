"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { Eye, Landmark, PencilLine } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { fetchPayoutAccount, savePayoutAccount } from "@/libs/api/payouts";
import { readApiError } from "@/libs/api/errors";
import type { PayoutAccountInput } from "@/types/payout";
import { cn } from "@/utils";

const INPUT =
  "w-full rounded-lg border bg-secondary px-3 py-2 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary";

const EMPTY: PayoutAccountInput = { accountName: "", accountNumber: "", ifsc: "", bankName: "", upiId: null };

/** Where this venue's payouts go: masked, revealable and editable by payouts admins. */
const BankDetailsCard = ({ venueSlug }: { venueSlug: string }) => {
  const { data: account, mutate, isLoading } = useSWR(["admin/payout-account", venueSlug], () => fetchPayoutAccount(venueSlug));
  const [revealed, setRevealed] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PayoutAccountInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reveal = async () => {
    try {
      setRevealed((await fetchPayoutAccount(venueSlug, true))?.accountNumber ?? null);
    } catch (caught) {
      setFormError(readApiError(caught).message);
    }
  };

  const edit = () => {
    setDraft(account ? { accountName: account.accountName, accountNumber: "", ifsc: account.ifsc, bankName: account.bankName, upiId: account.upiId } : EMPTY);
    setErrors({});
    setFormError(null);
    setIsEditing(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await mutate(await savePayoutAccount(venueSlug, { ...draft, upiId: draft.upiId?.trim() || null }), { revalidate: false });
      setRevealed(null);
      setIsEditing(false);
    } catch (caught) {
      const info = readApiError(caught);
      setErrors(info.fields);
      if (!Object.keys(info.fields).length) setFormError(info.message);
    } finally {
      setIsSaving(false);
    }
  };

  const field = (key: keyof PayoutAccountInput, label: string, placeholder: string, required = true) => (
    <div>
      <label htmlFor={`bank-${key}`} className="mb-1 block text-xs font-medium text-tertiary/70">
        {label}
        {required && <RequiredMark />}
      </label>
      <input
        id={`bank-${key}`}
        aria-required={required || undefined}
        value={draft[key] ?? ""}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
        className={cn(INPUT, errors[key] ? "border-primary" : "border-tertiary/15 hover:border-tertiary/30")}
      />
      {errors[key] && <p className="mt-1 text-xs text-primary">{errors[key]}</p>}
    </div>
  );

  return (
    <section className="rounded-2xl border border-tertiary/10 bg-secondary p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-tertiary">
          <Landmark aria-hidden="true" className="size-4 text-primary" />
          Bank details
        </h3>
        {!isEditing && (
          <button
            type="button"
            onClick={edit}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-tertiary/65 underline-offset-4 hover:text-primary hover:underline"
          >
            <PencilLine aria-hidden="true" className="size-3.5" />
            {account ? "Change" : "Add"}
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={save} noValidate className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {field("accountName", "Name on the account", "As the bank has it")}
          {field("accountNumber", "Account number", "6 to 18 digits")}
          {field("ifsc", "IFSC", "e.g. HDFC0001234")}
          {field("bankName", "Bank", "Bank name")}
          {field("upiId", "UPI id (optional)", "name@bank", false)}
          {formError && <p role="alert" className="text-xs text-primary sm:col-span-2">{formError}</p>}
          <div className="flex items-center justify-end gap-3 sm:col-span-2">
            <button type="button" onClick={() => setIsEditing(false)} className="text-sm font-medium text-tertiary/65 hover:text-tertiary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="cta-gradient rounded-lg px-4 py-2 text-sm font-semibold text-secondary shadow-sm disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save bank details"}
            </button>
          </div>
          <p className="text-xs text-tertiary/50 sm:col-span-2">The venue&apos;s staff get an email whenever these change.</p>
        </form>
      ) : isLoading ? (
        <div className="mt-3 h-12 animate-pulse rounded-lg bg-tertiary/5" />
      ) : account ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-tertiary/50">Account</dt>
            <dd className="flex items-center gap-2 font-mono text-tertiary">
              {revealed ?? account.accountNumberMasked}
              {!revealed && (
                <button type="button" onClick={() => void reveal()} aria-label="Reveal account number" className="text-tertiary/50 hover:text-primary">
                  <Eye aria-hidden="true" className="size-3.5" />
                </button>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-tertiary/50">IFSC</dt>
            <dd className="font-mono text-tertiary">{account.ifsc}</dd>
          </div>
          <div>
            <dt className="text-xs text-tertiary/50">Name</dt>
            <dd className="text-tertiary">{account.accountName}</dd>
          </div>
          <div>
            <dt className="text-xs text-tertiary/50">Bank</dt>
            <dd className="text-tertiary">{account.bankName}</dd>
          </div>
          {formError && <p role="alert" className="col-span-2 text-xs text-primary">{formError}</p>}
        </dl>
      ) : (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
          No bank details yet. Add them before transferring this venue&apos;s payout.
        </p>
      )}
    </section>
  );
};

export default BankDetailsCard;
