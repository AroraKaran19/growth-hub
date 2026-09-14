"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { MEMBER_COUPONS } from "@/data/coupons";
import { useCoupons } from "@/stores/coupons";
import { COUPON_SCOPE_LABELS, type CouponScope } from "@/types/coupon";
import { cn } from "@/utils";
import { couponHeadline, couponState } from "@/utils/coupon";
import { formatDay, todayIso } from "@/utils/date";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";

const INPUT =
  "w-full rounded-lg border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const LABEL = "mb-1.5 block text-sm font-medium text-tertiary";

const KIND_OPTIONS = [
  { value: "percent", label: "Percentage off" },
  { value: "flat", label: "Flat amount off" },
];

const SCOPE_OPTIONS = (Object.keys(COUPON_SCOPE_LABELS) as CouponScope[]).map(
  (value) => ({ value, label: COUPON_SCOPE_LABELS[value] }),
);

type Draft = {
  code: string;
  title: string;
  description: string;
  kind: "percent" | "flat";
  value: string;
  maxDiscount: string;
  minSpend: string;
  scope: CouponScope;
  validUntil: string;
};

type Errors = Partial<Record<keyof Draft, string>>;

const EMPTY_DRAFT: Draft = {
  code: "",
  title: "",
  description: "",
  kind: "percent",
  value: "",
  maxDiscount: "",
  minSpend: "0",
  scope: "all",
  validUntil: "",
};

const AdminCouponsPage = () => {
  const { catalogue, createdCodes, isHydrated, createCoupon, removeCoupon } = useCoupons();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Errors>({});
  const [created, setCreated] = useState<string | null>(null);

  if (!isHydrated) return <Skeleton />;

  const today = todayIso();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setCreated(null);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = (): Errors => {
    const found: Errors = {};
    const code = draft.code.trim().toUpperCase();
    const taken = [...catalogue, ...MEMBER_COUPONS].some((coupon) => coupon.code === code);
    if (!/^[A-Z0-9]{4,16}$/.test(code)) found.code = "Use 4 to 16 letters and numbers.";
    else if (taken) found.code = "That code already exists.";
    if (draft.title.trim().length < 5) found.title = "Add a short title members will see.";
    const value = Number(draft.value);
    if (!(value > 0)) found.value = "Enter a value above 0.";
    else if (draft.kind === "percent" && value > 90) found.value = "Keep percentage coupons at 90% or less.";
    if (draft.kind === "percent" && draft.maxDiscount && !(Number(draft.maxDiscount) > 0)) {
      found.maxDiscount = "Leave blank, or enter a cap above ₹0.";
    }
    if (!(Number(draft.minSpend) >= 0)) found.minSpend = "Enter ₹0 or more.";
    if (!draft.validUntil) found.validUntil = "Choose the last day it can be used.";
    else if (draft.validUntil < today) found.validUntil = "The end date has already passed.";
    return found;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const code = draft.code.trim().toUpperCase();
    createCoupon({
      code,
      title: draft.title.trim(),
      description: draft.description.trim() || draft.title.trim(),
      kind: draft.kind,
      value: Number(draft.value),
      maxDiscount: draft.kind === "percent" && draft.maxDiscount ? Number(draft.maxDiscount) : undefined,
      minSpend: Number(draft.minSpend) || 0,
      scope: draft.scope,
      validUntil: draft.validUntil,
      used: false,
    });
    setCreated(code);
    setDraft(EMPTY_DRAFT);
  };

  const field = (key: keyof Draft) =>
    cn(INPUT, errors[key] ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35");
  const errorText = (key: keyof Draft) =>
    errors[key] && <p className="mt-1.5 text-sm text-primary">{errors[key]}</p>;

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Codes members can add on their Coupons page or type in at checkout."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} noValidate className={`${CARD} h-fit p-5 sm:p-6`}>
          <h2 className="text-base font-bold text-tertiary">Create a coupon</h2>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="coupon-code" className={LABEL}>Code</label>
              <input
                id="coupon-code"
                autoComplete="off"
                autoCapitalize="characters"
                value={draft.code}
                onChange={(event) => set("code", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="e.g. FESTIVE25"
                className={cn(field("code"), "font-mono uppercase")}
              />
              {errorText("code")}
            </div>

            <div>
              <label htmlFor="coupon-title" className={LABEL}>Title</label>
              <input
                id="coupon-title"
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
              <SelectField
                label="Type"
                value={draft.kind}
                onChange={(value) => set("kind", value as Draft["kind"])}
                options={KIND_OPTIONS}
              />
              <div>
                <label htmlFor="coupon-value" className={LABEL}>
                  {draft.kind === "percent" ? "Percent" : "Amount (₹)"}
                </label>
                <input
                  id="coupon-value"
                  inputMode="numeric"
                  value={draft.value}
                  onChange={(event) => set("value", event.target.value.replace(/\D/g, ""))}
                  className={field("value")}
                />
                {errorText("value")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {draft.kind === "percent" && (
                <div>
                  <label htmlFor="coupon-max" className={LABEL}>Max off (₹)</label>
                  <input
                    id="coupon-max"
                    inputMode="numeric"
                    value={draft.maxDiscount}
                    onChange={(event) => set("maxDiscount", event.target.value.replace(/\D/g, ""))}
                    placeholder="No cap"
                    className={field("maxDiscount")}
                  />
                  {errorText("maxDiscount")}
                </div>
              )}
              <div>
                <label htmlFor="coupon-min" className={LABEL}>Min spend (₹)</label>
                <input
                  id="coupon-min"
                  inputMode="numeric"
                  value={draft.minSpend}
                  onChange={(event) => set("minSpend", event.target.value.replace(/\D/g, ""))}
                  className={field("minSpend")}
                />
                {errorText("minSpend")}
              </div>
            </div>

            <SelectField
              label="Applies to"
              value={draft.scope}
              onChange={(value) => set("scope", value as CouponScope)}
              options={SCOPE_OPTIONS}
            />

            <div>
              <label htmlFor="coupon-valid" className={LABEL}>Valid until</label>
              <input
                id="coupon-valid"
                type="date"
                min={today}
                value={draft.validUntil}
                onChange={(event) => set("validUntil", event.target.value)}
                className={cn(field("validUntil"), "relative")}
              />
              {errorText("validUntil")}
            </div>
          </div>

          {created && (
            <p role="status" className="mt-4 flex items-center gap-2 text-sm text-green-700">
              <CircleCheck aria-hidden="true" className="size-4" />
              {created} is live. Members can redeem it now.
            </p>
          )}

          <button
            type="submit"
            className="cta-gradient mt-5 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            Publish coupon
          </button>
        </form>

        <section className={`${CARD} h-fit overflow-x-auto`}>
          <h2 className="px-5 pt-5 text-base font-bold text-tertiary">Redeemable codes</h2>
          <table className="mt-3 w-full min-w-2xl text-left text-sm">
            <thead className="border-y border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Code</th>
                <th scope="col" className="px-5 py-3 font-semibold">Offer</th>
                <th scope="col" className="px-5 py-3 font-semibold">Applies to</th>
                <th scope="col" className="px-5 py-3 font-semibold">Valid until</th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/8">
              {catalogue.map((coupon) => {
                const isExpired = couponState(coupon, today) === "expired";
                const isCreated = createdCodes.includes(coupon.code);
                return (
                  <tr key={coupon.code}>
                    <td className="px-5 py-3.5">
                      <p className="font-mono font-semibold text-tertiary">{coupon.code}</p>
                      <p className="text-xs text-tertiary/50">{isCreated ? "Created here" : "Built in"}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-primary">{couponHeadline(coupon)}</p>
                      <p className="text-xs text-tertiary/55">
                        Min ₹{coupon.minSpend.toLocaleString("en-IN")}
                        {coupon.maxDiscount && `, up to ₹${coupon.maxDiscount.toLocaleString("en-IN")}`}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-tertiary/75">{COUPON_SCOPE_LABELS[coupon.scope]}</td>
                    <td className="px-5 py-3.5">
                      <span className={isExpired ? "text-primary" : "text-tertiary/75"}>
                        {formatDay(coupon.validUntil)}
                        {isExpired && " (expired)"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {isCreated && (
                        <button
                          type="button"
                          onClick={() => removeCoupon(coupon.code)}
                          className="text-sm font-medium text-primary transition-opacity hover:opacity-75"
                        >
                          Withdraw
                          <span className="sr-only"> {coupon.code}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-5 py-4 text-xs text-tertiary/55">
            Member wallet offers such as WELCOME50 are issued automatically and
            don&apos;t appear here.
          </p>
        </section>
      </div>
    </>
  );
};

export default AdminCouponsPage;
