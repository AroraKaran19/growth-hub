"use client";

import { useState, type FormEvent } from "react";
import { PencilLine } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { useAdminCoupons } from "@/hooks/useCoupons";
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
import { couponCap, couponHeadline, minSpendLabel } from "@/utils/coupon";
import { formatDay, todayIso } from "@/utils/date";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";

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
};

type Errors = Partial<Record<keyof Draft, string>>;

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
});

const statusOf = (coupon: AdminCoupon, today: string) => {
  if (!coupon.active) return { label: "Deactivated", style: "bg-tertiary/8 text-tertiary/65" };
  if (today > coupon.endsOn) return { label: "Ended", style: "bg-primary/10 text-primary" };
  if (coupon.totalLimit !== null && coupon.redemptionCount >= coupon.totalLimit) {
    return { label: "Used up", style: "bg-amber-500/15 text-amber-800" };
  }
  if (today < coupon.startsOn) return { label: "Scheduled", style: "bg-blue-600/10 text-blue-700" };
  return { label: "Live", style: "bg-green-500/12 text-green-700" };
};

const AdminCouponsPage = () => {
  const { coupons, isLoading, error, mutate } = useAdminCoupons();
  const [today] = useState(todayIso);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(today));
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (isLoading) return <Skeleton />;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const startEdit = (coupon: AdminCoupon) => {
    setEditing(coupon);
    setDraft(draftOf(coupon));
    setErrors({});
  };

  const reset = () => {
    setEditing(null);
    setDraft(emptyDraft(today));
    setErrors({});
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
        // The code never changes, and active is switched from the table so a stale form never flips it.
        delete patch.code;
        delete patch.active;
        await updateAdminCoupon(editing.id, patch);
        toastDone(`${input.code} saved.`);
      } else {
        await createAdminCoupon(input);
        toastDone(`${input.code} is live. Members can use it from ${formatDay(input.startsOn)}.`);
      }
      await mutate();
      setEditing(null);
      setDraft(emptyDraft(today));
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

  const toggleActive = async (coupon: AdminCoupon) => {
    setTogglingId(coupon.id);
    try {
      await updateAdminCoupon(coupon.id, { active: !coupon.active });
      await mutate();
      toastDone(coupon.active ? `${coupon.code} is paused.` : `${coupon.code} is live again.`);
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      setTogglingId(null);
    }
  };

  const field = (key: keyof Draft) =>
    cn(INPUT, errors[key] ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35");
  const errorText = (key: keyof Draft) => errors[key] && <p className="mt-1.5 text-sm text-primary">{errors[key]}</p>;
  const digits = (key: keyof Draft) => (value: string) => set(key, value.replace(/[^\d.]/g, ""));

  const live = coupons.filter((coupon) => statusOf(coupon, today).label === "Live").length;
  const uses = coupons.reduce((sum, coupon) => sum + coupon.redemptionCount, 0);

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Offers members use at checkout. Public coupons show in every wallet; code-only ones need the code."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} noValidate className={`${CARD} h-fit p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-tertiary">{editing ? `Edit ${editing.code}` : "Create a coupon"}</h2>
            {editing && (
              <button type="button" onClick={reset} className="text-sm font-medium text-tertiary/60 hover:text-tertiary">
                New coupon instead
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="coupon-code" className={LABEL}>Code</label>
              <input
                id="coupon-code"
                autoComplete="off"
                autoCapitalize="characters"
                disabled={Boolean(editing)}
                value={draft.code}
                onChange={(event) => set("code", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="e.g. FESTIVE25"
                className={cn(field("code"), "font-mono uppercase")}
              />
              {editing ? <p className="mt-1.5 text-xs text-tertiary/50">Codes can&apos;t change once created.</p> : errorText("code")}
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
              <SelectField label="Type" value={draft.kind} onChange={(value) => set("kind", value as Draft["kind"])} options={KIND_OPTIONS} />
              <div>
                <label htmlFor="coupon-value" className={LABEL}>{draft.kind === "percent" ? "Percent" : "Amount (₹)"}</label>
                <input id="coupon-value" inputMode="decimal" value={draft.value} onChange={(event) => digits("value")(event.target.value)} className={field("value")} />
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
                <label htmlFor="coupon-starts" className={LABEL}>Starts</label>
                <input id="coupon-starts" type="date" value={draft.startsOn} onChange={(event) => set("startsOn", event.target.value)} className={field("startsOn")} />
                {errorText("startsOn")}
              </div>
              <div>
                <label htmlFor="coupon-ends" className={LABEL}>Ends</label>
                <input
                  id="coupon-ends"
                  type="date"
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
              onChange={(value) => set("visibility", value as CouponVisibility)}
              options={VISIBILITY_OPTIONS}
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="cta-gradient mt-5 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : editing ? "Save changes" : "Publish coupon"}
          </button>
        </form>

        <section className={`${CARD} h-fit overflow-x-auto`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5">
            <h2 className="text-base font-bold text-tertiary">All coupons</h2>
            <p className="text-sm text-tertiary/55">
              {live} live, {uses} {uses === 1 ? "use" : "uses"} so far
            </p>
          </div>
          {error ? (
            <p role="alert" className="px-5 py-14 text-center text-sm text-primary">
              We couldn&apos;t load coupons. Refresh to try again.
            </p>
          ) : coupons.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-tertiary/60">No coupons yet. Create the first one.</p>
          ) : (
            <table className="mt-3 w-full min-w-3xl text-left text-sm">
              <thead className="border-y border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Code</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Offer</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Dates</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Uses</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tertiary/8">
                {coupons.map((coupon) => {
                  const status = statusOf(coupon, today);
                  const cap = couponCap(coupon);
                  return (
                    <tr key={coupon.id} className={cn(editing?.id === coupon.id && "bg-primary/4")}>
                      <td className="px-5 py-3.5">
                        <p className="font-mono font-semibold text-tertiary">{coupon.code}</p>
                        <p className="text-xs text-tertiary/50">{coupon.visibility === "public" ? "In every wallet" : "Code only"}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-primary">{couponHeadline(coupon)}</p>
                        <p className="text-xs text-tertiary/55">
                          {COUPON_SCOPE_LABELS[coupon.appliesTo]}, {minSpendLabel(coupon.minSpend).toLowerCase()}
                          {cap ? `, ${cap.toLowerCase()}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-tertiary/75">
                        <p>{formatDay(coupon.startsOn)}</p>
                        <p className="text-xs text-tertiary/55">to {formatDay(coupon.endsOn)}</p>
                      </td>
                      <td className="px-5 py-3.5 text-tertiary/75">
                        {coupon.redemptionCount}
                        {coupon.totalLimit !== null && <span className="text-tertiary/50"> of {coupon.totalLimit}</span>}
                        <p className="text-xs text-tertiary/50">{coupon.perMemberLimit} per member</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.style)}>{status.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(coupon)}
                            aria-label={`Edit ${coupon.code}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-tertiary/15 text-tertiary/70 shadow-sm transition-all hover:-translate-y-0.5 hover:text-primary"
                          >
                            <PencilLine aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={togglingId === coupon.id}
                            onClick={() => void toggleActive(coupon)}
                            className="text-sm font-medium text-tertiary/65 underline-offset-4 hover:text-primary hover:underline disabled:opacity-50"
                          >
                            {coupon.active ? "Deactivate" : "Reactivate"}
                            <span className="sr-only"> {coupon.code}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
};

export default AdminCouponsPage;
