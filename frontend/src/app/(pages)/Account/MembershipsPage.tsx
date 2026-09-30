"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, CircleCheck } from "lucide-react";
import { useAddonOrders } from "@/hooks/useAddonOrders";
import { useMemberships } from "@/hooks/useMemberships";
import { readApiError } from "@/libs/api/errors";
import { askToCancel, withdrawCancellation } from "@/libs/api/cancellations";
import { stopRenewal } from "@/libs/api/memberships";
import type { ApiAddonOrder } from "@/types/addonOrder";
import type { VenueAddonOffer } from "@/types/catalogue";
import { isLiveMembership, type ApiMembership } from "@/types/membership";
import { formatDay, todayIso } from "@/utils/date";
import { upcomingAddonOrders } from "./addonOrderRules";
import BuyAddonsModal from "./components/BuyAddonsModal";
import MemberPassModal from "./components/MemberPassModal";
import CancelRequestModal from "./components/CancelRequestModal";
import MembershipCard from "./components/MembershipCard";
import MembershipHistoryRow from "./components/MembershipHistoryRow";
import StopRenewalModal from "./components/StopRenewalModal";

const HISTORY_PAGE_SIZE = 3;

type Dialog =
  | { kind: "pass" | "stop" | "cancel"; membership: ApiMembership }
  | { kind: "addons"; membership: ApiMembership; offers: VenueAddonOffer[]; openDays: number[] }
  | { kind: "cancel-addons"; order: ApiAddonOrder };

const MembershipsPage = () => {
  const { memberships, error, isLoading, mutate } = useMemberships();
  const addonOrders = useAddonOrders();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [stopped, setStopped] = useState<ApiMembership | null>(null);
  const [historyShown, setHistoryShown] = useState(HISTORY_PAGE_SIZE);

  const live = memberships.filter(isLiveMembership);
  const history = memberships.filter((item) => !isLiveMembership(item));
  const nextCharge = live
    .map((item) => item.renewsOn)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(0);
  const renewing = live.filter((item) => item.renewsOn).length;

  const stats = [
    { label: "Active memberships", value: String(live.length) },
    { label: "Renewing", value: String(renewing) },
    { label: "Next charge", value: nextCharge ? formatDay(nextCharge) : "None" },
  ];

  const remainingHistory = history.length - historyShown;
  const today = todayIso();
  const ordersFor = (ref: string) =>
    upcomingAddonOrders(
      addonOrders.orders.filter((order) => order.targetRef === ref),
      today,
    );

  const confirmStop = async (membership: ApiMembership) => {
    const updated = await stopRenewal(membership.ref);
    // Refetched rather than swapped in, so the card keeps its cancellation request.
    await mutate();
    setStopped(updated);
    setDialog(null);
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tertiary">My Memberships</h1>
          <p className="mt-1 text-sm text-tertiary/60">
            Your reserved desks and cabins, what you have paid for, and when each plan renews.
          </p>
        </div>
        <Link
          href="/memberships"
          className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
        >
          Explore plans
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>

      {stopped && (
        <p
          role="status"
          className="mt-5 flex items-center gap-2 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-800"
        >
          <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
          {stopped.venue.name} will not renew. Your seat stays yours until{" "}
          {stopped.paidThrough ? formatDay(stopped.paidThrough) : "the end of the paid period"}.
        </p>
      )}

      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-tertiary/10 pt-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-tertiary/10 border-b-2 border-b-primary bg-secondary px-4 py-3.5"
          >
            <dt className="text-sm text-tertiary/60">{stat.label}</dt>
            <dd className="mt-1 text-xl font-bold text-tertiary">{isLoading ? " " : stat.value}</dd>
          </div>
        ))}
      </dl>

      {isLoading ? (
        <div className="mt-7 h-64 animate-pulse rounded-2xl border border-tertiary/10 bg-tertiary/3" />
      ) : error ? (
        <p role="alert" className="mt-7 rounded-2xl border border-primary/25 bg-primary/5 px-6 py-10 text-center text-sm text-tertiary">
          We couldn&apos;t load your memberships. Refresh to try again.
        </p>
      ) : live.length === 0 ? (
        <div className="mt-7 rounded-2xl border border-tertiary/10 px-6 py-14 text-center">
          <p className="text-base font-semibold text-tertiary">No active memberships</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
            A membership reserves your desk or cabin at a venue every day of the plan, and renews automatically
            until you stop it.
          </p>
          <Link
            href="/memberships"
            className="cta-gradient mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary"
          >
            See membership plans
          </Link>
        </div>
      ) : (
        <section className="mt-7">
          <h2 className="text-lg font-bold text-tertiary">Active</h2>
          <div className="mt-4 flex flex-col gap-4">
            {live.map((membership) => (
              <MembershipCard
                key={membership.ref}
                membership={membership}
                onShowPass={(item) => setDialog({ kind: "pass", membership: item })}
                onStopRenewal={(item) => setDialog({ kind: "stop", membership: item })}
                onRequestCancel={(item) => setDialog({ kind: "cancel", membership: item })}
                onWithdrawRequest={async (item) => {
                  await withdrawCancellation("membership", item.ref);
                  await mutate();
                }}
                addonOrders={ordersFor(membership.ref)}
                onBuyAddons={(item, offers, openDays) => setDialog({ kind: "addons", membership: item, offers, openDays })}
                onRequestAddonCancel={(order) => setDialog({ kind: "cancel-addons", order })}
                onWithdrawAddonRequest={async (order) => {
                  await withdrawCancellation("addon-order", order.ref);
                  await addonOrders.mutate();
                }}
              />
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-tertiary">History</h2>
            <p className="text-sm text-tertiary/55">
              Showing {Math.min(historyShown, history.length)} of {history.length}
            </p>
          </div>

          <ul
            id="membership-history"
            className="mt-4 divide-y divide-tertiary/8 rounded-2xl border border-tertiary/10 bg-secondary"
          >
            {history.slice(0, historyShown).map((membership) => (
              <MembershipHistoryRow key={membership.ref} membership={membership} />
            ))}
          </ul>

          {history.length > HISTORY_PAGE_SIZE && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                aria-controls="membership-history"
                onClick={() =>
                  setHistoryShown((shown) => (remainingHistory > 0 ? shown + HISTORY_PAGE_SIZE : HISTORY_PAGE_SIZE))
                }
                className="inline-flex items-center gap-2 rounded-lg border border-tertiary/20 px-5 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
              >
                {remainingHistory > 0 ? `Load ${Math.min(remainingHistory, HISTORY_PAGE_SIZE)} more` : "Show less"}
                <ChevronDown aria-hidden="true" className={remainingHistory > 0 ? "size-4" : "size-4 rotate-180"} />
              </button>
            </div>
          )}
        </section>
      )}

      {dialog?.kind === "pass" && (
        <MemberPassModal membership={dialog.membership} onClose={() => setDialog(null)} />
      )}

      {dialog?.kind === "cancel" && (
        <CancelRequestModal
          subject={`Membership ${dialog.membership.ref}`}
          venueName={dialog.membership.venue.name}
          onClose={() => setDialog(null)}
          onSubmit={async (input) => {
            await askToCancel("membership", dialog.membership.ref, input);
            await mutate();
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "addons" && (
        <BuyAddonsModal
          membership={dialog.membership}
          offers={dialog.offers}
          openDays={dialog.openDays}
          onClose={() => setDialog(null)}
          onBought={() => void addonOrders.mutate()}
        />
      )}

      {dialog?.kind === "cancel-addons" && (
        <CancelRequestModal
          subject={`Add-ons ${dialog.order.ref}`}
          venueName={dialog.order.venue.name}
          onClose={() => setDialog(null)}
          onSubmit={async (input) => {
            await askToCancel("addon-order", dialog.order.ref, input);
            await addonOrders.mutate();
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "stop" && (
        <StopRenewalModal
          membership={dialog.membership}
          onCancel={() => setDialog(null)}
          onConfirm={() => confirmStop(dialog.membership)}
          errorFor={(caught) => readApiError(caught).message}
        />
      )}
    </>
  );
};

export default MembershipsPage;
