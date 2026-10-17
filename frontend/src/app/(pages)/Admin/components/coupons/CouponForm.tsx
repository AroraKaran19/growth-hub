"use client";

import { useState, type FormEvent } from "react";
import { TicketPercent } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import SelectField from "@/app/components/ui/form/SelectField";
import { createAdminCoupon, updateAdminCoupon } from "@/libs/api/coupons";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import {
  COUPON_SCOPE_LABELS,
  type AdminCoupon,
  type CouponInput,
  type CouponScope,
  type CouponVisibility,
} from "@/types/coupon";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import { RAISED } from "../venue/fields";
import CustomerPicker, { type PickedCustomer } from "./CustomerPicker";

const INPUT =
  "w-full rounded-lg border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:bg-tertiary/4 disabled:text-tertiary/55";
const LABEL = "mb-1.5 block text-sm font-medium text-tertiary";

const KIND_OPTIONS = [
  { value: "percent", label: "Percentage off" },
  { value: "flat", label: "Flat amount off" },
];

const SCOPE_OPTIONS = (Object.keys(COUPON_SCOPE_LABELS) as CouponScope[]).map((value) => ({
  value,
  label: COUPON_SCOPE_LABELS[value],
}));

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Every member's wallet" },
  { value: "code-only", label: "Only with the code" },
  { value: "member", label: "One customer" },
];

type Draft = {
  code: string;
  title: string;
  description: string;
  kind: "percent" | "flat";
  value: string;
  maxDiscount: string;
  minSpend: string;
  appliesTo: CouponScope;
  startsOn: string;
  endsOn: string;
  perMemberLimit: string;
  totalLimit: string;
  visibility: CouponVisibility;
  customer: PickedCustomer | null;
};

type Errors = Partial<Record<keyof Draft | "memberId", string>>;

const emptyDraft = (today: string): Draft => ({
  code: "",
  title: "",
  description: "",
  kind: "percent",
  value: "",
  maxDiscount: "",
  minSpend: "0",
  appliesTo: "any",
  startsOn: today,
  endsOn: "",
  perMemberLimit: "1",
  totalLimit: "",
  visibility: "code-only",
  customer: null,
});

const rupeesText = (paise: number | null) => (paise === null ? "" : String(paise / 100));
const toPaise = (rupees: string) => Math.round(Number(rupees) * 100);

const draftOf = (coupon: AdminCoupon): Draft => ({
  code: coupon.code,
  title: coupon.title,
  description: coupon.description,
  kind: coupon.kind,
  value: coupon.kind === "percent" ? String(coupon.value) : rupeesText(coupon.value),
  maxDiscount: rupeesText(coupon.maxDiscount),
  minSpend: rupeesText(coupon.minSpend),
  appliesTo: coupon.appliesTo,
  startsOn: coupon.startsOn,
  endsOn: coupon.endsOn,
  perMemberLimit: String(coupon.perMemberLimit),
  totalLimit: coupon.totalLimit === null ? "" : String(coupon.totalLimit),
  visibility: coupon.visibility,
  customer: coupon.assignedTo
    ? { id: coupon.assignedTo.memberId, name: coupon.assignedTo.name, phone: coupon.assignedTo.phone, email: null }
    : null,
});

type CouponFormProps = {
  editing: AdminCoupon | null;
  today: string;
  onDone: () => Promise<unknown>;
};

const CouponForm = ({ editing, today, onDone }: CouponFormProps) => {
  const [draft, setDraft] = useState<Draft>(() => (editing ? draftOf(editing) : emptyDraft(today)));
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = (): Errors => {
    const found: Errors = {};
    if (!/^[A-Z0-9]{4,16}$/.test(draft.code)) found.code = "Use 4 to 16 letters and numbers.";
    if (draft.title.trim().length < 2) found.title = "Add a short title members will see.";
    const value = Number(draft.value);
    if (!(value > 0)) found.value = "Enter a value above 0.";
    else if (draft.kind === "percent" && (value > 90 || !Number.isInteger(value))) {
      found.value = "Use a whole percentage up to 90.";
    }
    if (draft.kind === "percent" && draft.maxDiscount && !(Number(draft.maxDiscount) > 0)) {
      found.maxDiscount = "Leave blank, or enter a cap above ₹0.";
    }
    if (!(Number(draft.minSpend) >= 0)) found.minSpend = "Enter ₹0 or more.";
    if (!draft.startsOn) found.startsOn = "Choose the first day.";
    if (!draft.endsOn) found.endsOn = "Choose the last day it can be used.";
    else if (draft.endsOn < draft.startsOn) found.endsOn = "End on or after the start date.";
    if (!(Number(draft.perMemberLimit) >= 1)) found.perMemberLimit = "At least 1.";
    if (draft.totalLimit && !(Number(draft.totalLimit) >= 1)) found.totalLimit = "Leave blank for no limit.";
    if (draft.visibility === "member" && !draft.customer) found.memberId = "Pick a customer.";
    return found;
  };

  const inputOf = (): CouponInput => ({
    code: draft.code,
    title: draft.title.trim(),
    description: draft.description.trim(),
    kind: draft.kind,
    value: draft.kind === "percent" ? Number(draft.value) : toPaise(draft.value),
    maxDiscount: draft.kind === "percent" && draft.maxDiscount ? toPaise(draft.maxDiscount) : null,
    minSpend: toPaise(draft.minSpend || "0"),
    appliesTo: draft.appliesTo,
    startsOn: draft.startsOn,
    endsOn: draft.endsOn,
    perMemberLimit: Number(draft.perMemberLimit),
    totalLimit: draft.totalLimit ? Number(draft.totalLimit) : null,
    visibility: draft.visibility,
    ...(draft.visibility === "member" && draft.customer && { memberId: draft.customer.id }),
    active: editing?.active ?? true,
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    try {
      const input = inputOf();
      if (editing) {
        const patch: Partial<CouponInput> = { ...input };
        // Code is fixed; active is toggled from the table so a stale form can't flip it.
        delete patch.code;
        delete patch.active;
        await updateAdminCoupon(editing.id, patch);
        toastDone(`${input.code} saved.`);
      } else {
        await createAdminCoupon(input);
        toastDone(`${input.code} is live. Members can use it from ${formatDay(input.startsOn)}.`);
      }
      await onDone();
    } catch (caught) {
      const info = readApiError(caught);
      const fields = info.fields as Errors;
      if (info.code === "CODE_TAKEN") setErrors({ code: info.message });
      else if (Object.keys(fields).length) setErrors(fields);
      else toastFailed(info.message);
    } finally {
      setIsSaving(false);
    }
  };

  const field = (key: keyof Draft) =>
    cn(INPUT, errors[key] ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35");
  const errorText = (key: keyof Draft) => errors[key] && <p className="mt-1.5 text-sm text-primary">{errors[key]}</p>;
  const digits = (key: keyof Draft) => (value: string) => set(key, value.replace(/[^\d.]/g, ""));

  return (
    <form onSubmit={handleSubmit} noValidate className={cn(RAISED, "p-5 sm:p-6")}>
      <div className="flex items-center gap-3 pr-8">
        <span className="cta-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-secondary">
          <TicketPercent aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-tertiary">{editing ? `Edit ${editing.code}` : "Create a coupon"}</h2>
          <p className="text-sm text-tertiary/55">Show it in every wallet, keep it behind a code, or give it to one customer.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label htmlFor="coupon-code" className={LABEL}>
            Code
            {!editing && <RequiredMark />}
          </label>
          <input
            id="coupon-code"
            autoComplete="off"
            autoCapitalize="characters"
            aria-required={editing ? undefined : true}
            disabled={Boolean(editing)}
            value={draft.code}
            onChange={(event) => set("code", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="e.g. FESTIVE25"
            className={cn(field("code"), "font-mono uppercase")}
          />
          {editing ? <p className="mt-1.5 text-xs text-tertiary/50">Codes can&apos;t change once created.</p> : errorText("code")}
        </div>

        <div>
          <label htmlFor="coupon-title" className={LABEL}>
            Title
            <RequiredMark />
          </label>
          <input
            id="coupon-title"
            aria-required="true"
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="25% off festive bookings"
            className={field("title")}
          />
          {errorText("title")}
        </div>

        <div>
          <label htmlFor="coupon-description" className={LABEL}>
            Description <span className="font-normal text-tertiary/45">(optional)</span>
          </label>
          <input
            id="coupon-description"
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="Who it is for and what it covers"
            className={field("description")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Type" required value={draft.kind} onChange={(value) => set("kind", value as Draft["kind"])} options={KIND_OPTIONS} />
          <div>
            <label htmlFor="coupon-value" className={LABEL}>
              {draft.kind === "percent" ? "Percent" : "Amount (₹)"}
              <RequiredMark />
            </label>
            <input id="coupon-value" aria-required="true" inputMode="decimal" value={draft.value} onChange={(event) => digits("value")(event.target.value)} className={field("value")} />
            {errorText("value")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {draft.kind === "percent" && (
            <div>
              <label htmlFor="coupon-max" className={LABEL}>Max off (₹)</label>
              <input
                id="coupon-max"
                inputMode="decimal"
                value={draft.maxDiscount}
                onChange={(event) => digits("maxDiscount")(event.target.value)}
                placeholder="No cap"
                className={field("maxDiscount")}
              />
              {errorText("maxDiscount")}
            </div>
          )}
          <div>
            <label htmlFor="coupon-min" className={LABEL}>Min spend (₹)</label>
            <input id="coupon-min" inputMode="decimal" value={draft.minSpend} onChange={(event) => digits("minSpend")(event.target.value)} className={field("minSpend")} />
            {errorText("minSpend")}
          </div>
        </div>

        <SelectField label="Applies to" value={draft.appliesTo} onChange={(value) => set("appliesTo", value as CouponScope)} options={SCOPE_OPTIONS} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="coupon-starts" className={LABEL}>
              Starts
              <RequiredMark />
            </label>
            <input id="coupon-starts" type="date" aria-required="true" value={draft.startsOn} onChange={(event) => set("startsOn", event.target.value)} className={field("startsOn")} />
            {errorText("startsOn")}
          </div>
          <div>
            <label htmlFor="coupon-ends" className={LABEL}>
              Ends
              <RequiredMark />
            </label>
            <input
              id="coupon-ends"
              type="date"
              aria-required="true"
              min={draft.startsOn || today}
              value={draft.endsOn}
              onChange={(event) => set("endsOn", event.target.value)}
              className={field("endsOn")}
            />
            {errorText("endsOn")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="coupon-per-member" className={LABEL}>Uses per member</label>
            <input
              id="coupon-per-member"
              inputMode="numeric"
              value={draft.perMemberLimit}
              onChange={(event) => set("perMemberLimit", event.target.value.replace(/\D/g, ""))}
              className={field("perMemberLimit")}
            />
            {errorText("perMemberLimit")}
          </div>
          <div>
            <label htmlFor="coupon-total" className={LABEL}>Total uses</label>
            <input
              id="coupon-total"
              inputMode="numeric"
              value={draft.totalLimit}
              onChange={(event) => set("totalLimit", event.target.value.replace(/\D/g, ""))}
              placeholder="No limit"
              className={field("totalLimit")}
            />
            {errorText("totalLimit")}
          </div>
        </div>

        <SelectField
          label="Who sees it"
          value={draft.visibility}
          onChange={(value) => {
            set("visibility", value as CouponVisibility);
            setErrors((current) => ({ ...current, memberId: undefined }));
          }}
          options={VISIBILITY_OPTIONS}
        />

        {draft.visibility === "member" && (
          <CustomerPicker
            value={draft.customer}
            onChange={(customer) => {
              set("customer", customer);
              setErrors((current) => ({ ...current, memberId: undefined }));
            }}
            error={errors.memberId}
          />
        )}
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="cta-gradient mt-5 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isSaving ? "Saving..." : editing ? "Save changes" : "Publish coupon"}
      </button>
    </form>
  );
};

export default CouponForm;
