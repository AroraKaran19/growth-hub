"use client";

import { useState } from "react";
import { PencilLine, Plus, UserRound } from "lucide-react";
import { useAdminCoupons } from "@/hooks/useCoupons";
import { updateAdminCoupon } from "@/libs/api/coupons";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { COUPON_SCOPE_LABELS, type AdminCoupon } from "@/types/coupon";
import { cn } from "@/utils";
import { couponCap, couponHeadline, minSpendLabel } from "@/utils/coupon";
import { formatDay, todayIso } from "@/utils/date";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import CouponForm from "./components/coupons/CouponForm";
import FormModal from "./components/FormModal";
import { QUIET } from "./components/venue/fields";

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
  const [form, setForm] = useState<{ editing: AdminCoupon | null } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (isLoading) return <Skeleton />;

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

  const live = coupons.filter((coupon) => statusOf(coupon, today).label === "Live").length;
  const uses = coupons.reduce((sum, coupon) => sum + coupon.redemptionCount, 0);

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Offers members use at checkout. Public coupons show in every wallet, code-only ones need the code, and one-customer ones reach a single wallet."
        actions={
          <button
            type="button"
            onClick={() => setForm({ editing: null })}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:opacity-95"
          >
            <Plus aria-hidden="true" className="size-4" />
            New coupon
          </button>
        }
      />

      <section className={`${CARD} mt-6 overflow-x-auto shadow-lg shadow-tertiary/5`}>
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
          <div className="px-5 py-14 text-center">
            <p className="text-sm text-tertiary/60">No coupons yet.</p>
            <button type="button" onClick={() => setForm({ editing: null })} className={cn(QUIET, "mt-2 text-primary")}>
              Create the first one
            </button>
          </div>
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
                  <tr key={coupon.id} className="transition-colors hover:bg-tertiary/2">
                    <td className="px-5 py-3.5">
                      <p className="font-mono font-semibold text-tertiary">{coupon.code}</p>
                      {coupon.visibility === "member" && coupon.assignedTo ? (
                        <p className="mt-0.5 flex max-w-56 flex-col text-xs">
                          <span className="flex min-w-0 items-center gap-1 font-medium text-primary">
                            <UserRound aria-hidden="true" className="size-3 shrink-0" />
                            <span className="truncate">For {coupon.assignedTo.name}</span>
                          </span>
                          <span className="text-tertiary/50">{coupon.assignedTo.phone}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-tertiary/50">{coupon.visibility === "public" ? "In every wallet" : "Code only"}</p>
                      )}
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
                          onClick={() => setForm({ editing: coupon })}
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

      {form && (
        <FormModal label={form.editing ? `Edit ${form.editing.code}` : "Create a coupon"} onClose={() => setForm(null)}>
          <CouponForm
            editing={form.editing}
            today={today}
            onDone={async () => {
              setForm(null);
              await mutate();
            }}
          />
        </FormModal>
      )}
    </>
  );
};

export default AdminCouponsPage;
