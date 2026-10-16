"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, CalendarDays, Check, ClipboardList, PencilLine, Plus, Trash2 } from "lucide-react";
import { useAdminMembershipPlans } from "@/hooks/useMembershipPlans";
import { deletePlan, reorderPlans, updatePlan } from "@/libs/api/membershipPlansAdmin";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import type { MembershipPlan, PlanInput } from "@/types/membershipPlan";
import { cn } from "@/utils";
import { hoursSummary } from "@/utils/venueHours";
import { PartnerPageHeader as PageHeader, PartnerSkeleton as Skeleton } from "../Partner/components/PartnerUi";
import FormModal from "./components/FormModal";
import PlanForm from "./components/plans/PlanForm";
import { daysLabel, lockLabel, priceLabel, SPACES } from "./components/plans/planLabels";
import Toggle from "./components/Toggle";
import VenuePicker from "./components/VenuePicker";
import { QUIET } from "./components/venue/fields";

const toInput = ({ name, description, includes, space, roomMode, slotHours, days, prices, maxSeats, visible }: MembershipPlan): PlanInput => ({
  name,
  description,
  includes,
  space,
  roomMode,
  slotHours,
  days,
  prices,
  maxSeats,
  visible,
});

const ICONS = Object.fromEntries(SPACES.map((space) => [space.value, space.icon]));

const AdminMembershipPlansPage = () => {
  const searchParams = useSearchParams();
  // Venue forms and the pricing page link here with ?venue=slug.
  const [venueSlug, setVenueSlug] = useState(() => searchParams.get("venue") ?? "");
  const { venues, venue, plans, error, isLoading, mutate } = useAdminMembershipPlans(venueSlug);
  const [form, setForm] = useState<{ editing: MembershipPlan | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (isLoading) return <Skeleton />;

  const shownSlug = venue?.slug ?? venueSlug;

  const run = async (id: string, action: () => Promise<unknown>, message: string) => {
    setBusyId(id);
    try {
      await action();
      await mutate();
      toastDone(message);
      return true;
    } catch (caught) {
      toastFailed(readApiError(caught).message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const move = (index: number, step: -1 | 1) => {
    const ids = plans.map((plan) => plan.id);
    [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
    void run(plans[index].id, () => reorderPlans(shownSlug, ids), "Order saved.");
  };

  const pickVenue = (slug: string) => {
    setForm(null);
    setConfirmDelete(null);
    setVenueSlug(slug);
  };

  const onSale = plans.filter((plan) => plan.visible).length;

  return (
    <>
      <PageHeader
        title="Membership plans"
        description="Build the memberships each venue sells: what they lock, on which days, and the price for each length."
        actions={
          venues.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <VenuePicker label="Venue" hideLabel value={shownSlug} onChange={(slug) => pickVenue(slug)} className="w-64" />
              {venue && (
                <button
                  type="button"
                  onClick={() => setForm({ editing: null })}
                  className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:opacity-95"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Add plan
                </button>
              )}
            </div>
          )
        }
      />

      {error ? (
        <p role="alert" className="mt-6 text-sm text-primary">
          We couldn&apos;t load membership plans. Refresh to try again.
        </p>
      ) : venues.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-tertiary/15 p-10 text-center">
          <ClipboardList aria-hidden="true" className="mx-auto size-8 text-tertiary/25" />
          <p className="mt-3 text-sm text-tertiary/60">Add a venue first. Plans belong to one venue.</p>
        </div>
      ) : !venue ? (
        <div className="mt-6">
          <Skeleton />
        </div>
      ) : (
        <section aria-labelledby="plans-heading" className="mt-6">
          <div className="relative overflow-hidden rounded-2xl bg-tertiary px-5 py-4 text-secondary shadow-xl shadow-tertiary/15">
            <div aria-hidden="true" className="absolute -right-12 -top-16 size-44 rounded-full bg-primary/40 blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="plans-heading" className="text-lg font-bold">
                  {venue.name}
                </h2>
                <p className="text-sm text-secondary/65">
                  {hoursSummary(venue.hours) || "No opening hours set yet"}
                </p>
              </div>
              <p className="text-sm text-secondary/70">
                <span className="text-2xl font-bold text-secondary tabular-nums">{onSale}</span> on sale
                {plans.length - onSale > 0 && `, ${plans.length - onSale} hidden`}
              </p>
            </div>
          </div>

          {plans.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-tertiary/15 p-10 text-center">
              <ClipboardList aria-hidden="true" className="mx-auto size-8 text-tertiary/25" />
              <p className="mt-3 text-sm text-tertiary/60">No plans at {venue.name} yet.</p>
              <button type="button" onClick={() => setForm({ editing: null })} className={cn(QUIET, "mt-2 text-primary")}>
                Add the first plan
              </button>
            </div>
          ) : (
            <ol className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {plans.map((plan, index) => {
                const Icon = ICONS[plan.space];
                return (
                  <li
                    key={plan.id}
                    className={cn(
                      "flex flex-col rounded-2xl border border-tertiary/8 bg-secondary p-5 shadow-md shadow-tertiary/5 transition-all hover:-translate-y-0.5 hover:shadow-lg",
                      !plan.visible && "opacity-65",
                    )}
                  >
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tertiary text-secondary">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <div className="min-w-0 grow">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-tertiary">
                          {plan.name}
                          {plan.inUse && <span className="rounded-full bg-green-500/12 px-2 py-0.5 text-xs font-medium text-green-700">Has members</span>}
                        </p>
                        <p className="mt-0.5 text-sm text-tertiary/60">{lockLabel(plan)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-surface px-3.5 py-2.5">
                      <span className="text-base font-bold text-tertiary">{priceLabel(plan)}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-tertiary/55">
                        <CalendarDays aria-hidden="true" className="size-3.5" />
                        {daysLabel(plan.days)}
                      </span>
                    </div>

                    {plan.includes.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {plan.includes.map((line) => (
                          <li key={line} className="inline-flex items-center gap-1 rounded-full bg-tertiary/5 px-2.5 py-1 text-xs text-tertiary/75">
                            <Check aria-hidden="true" className="size-3 text-primary" />
                            {line}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tertiary/8 pt-3">
                        <Toggle
                          label={plan.visible ? "On sale" : "Hidden"}
                          checked={plan.visible}
                          onChange={(visible) =>
                            void run(plan.id, () => updatePlan(plan.id, { ...toInput(plan), visible }), visible ? `${plan.name} is on sale.` : `${plan.name} is hidden. Current members keep it.`)
                          }
                        />
                        <div className="flex items-center gap-1">
                          <button type="button" aria-label="Move up" disabled={index === 0 || busyId !== null} onClick={() => move(index, -1)} className="rounded-lg p-2 text-tertiary/60 transition-colors hover:bg-tertiary/5 hover:text-tertiary disabled:opacity-30">
                            <ArrowUp aria-hidden="true" className="size-4" />
                          </button>
                          <button type="button" aria-label="Move down" disabled={index === plans.length - 1 || busyId !== null} onClick={() => move(index, 1)} className="rounded-lg p-2 text-tertiary/60 transition-colors hover:bg-tertiary/5 hover:text-tertiary disabled:opacity-30">
                            <ArrowDown aria-hidden="true" className="size-4" />
                          </button>
                          <button type="button" aria-label={`Edit ${plan.name}`} onClick={() => setForm({ editing: plan })} className="rounded-lg p-2 text-tertiary/60 transition-colors hover:bg-tertiary/5 hover:text-tertiary">
                            <PencilLine aria-hidden="true" className="size-4" />
                          </button>
                          {!plan.inUse && (
                            <button type="button" aria-label={`Delete ${plan.name}`} onClick={() => setConfirmDelete(plan.id)} className="rounded-lg p-2 text-primary/70 transition-colors hover:bg-primary/5 hover:text-primary">
                              <Trash2 aria-hidden="true" className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {confirmDelete === plan.id && (
                        <div role="alert" className="mt-3 flex flex-wrap items-center gap-4 rounded-xl bg-primary/5 p-3 text-sm text-tertiary">
                          Delete {plan.name} for good?
                          <button
                            type="button"
                            disabled={busyId === plan.id}
                            onClick={() => void run(plan.id, () => deletePlan(plan.id), `${plan.name} deleted.`).then(() => setConfirmDelete(null))}
                            className={cn(QUIET, "text-primary")}
                          >
                            Yes, delete
                          </button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className={cn(QUIET, "text-tertiary/60")}>
                            Keep it
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}

      {form && venue && (
        <FormModal label={form.editing ? `Edit ${form.editing.name}` : "Add a plan"} onClose={() => setForm(null)}>
          <PlanForm
            venue={venue}
            editing={form.editing}
            onCancel={() => setForm(null)}
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

export default AdminMembershipPlansPage;
