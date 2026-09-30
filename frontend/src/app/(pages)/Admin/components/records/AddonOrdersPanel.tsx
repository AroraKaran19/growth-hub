"use client";

import { Fragment, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { useAdminAddonOrders } from "@/hooks/useAddonOrders";
import { voidAdminAddonOrder } from "@/libs/api/addonOrders";
import { readApiError } from "@/libs/api/errors";
import type { ApiAddonOrder } from "@/types/addonOrder";
import { cn } from "@/utils";
import { datesLabel } from "../../../Account/addonOrderRules";
import { rupees } from "../../../Partner/requestRules";
import { PARTNER_CARD as CARD } from "../../../Partner/components/PartnerUi";
import AdminCancelForm from "./AdminCancelForm";

const CHANNEL_OPTIONS = [
  { value: "", label: "Online and desk" },
  { value: "app", label: "Paid online" },
  { value: "desk", label: "Paid at the desk" },
];

const VoidDeskSale = ({ order, onDone }: { order: ApiAddonOrder; onDone: () => Promise<unknown> }) => {
  const [isSure, setIsSure] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await voidAdminAddonOrder(order.ref);
      await onDone();
    } catch (caught) {
      setError(readApiError(caught).message);
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-tertiary/70">
        The venue took this payment itself, so voiding only removes the record. Any refund is between the venue and
        the member.
      </p>
      {error && (
        <p role="alert" className="text-sm text-primary">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        {isSure ? (
          <>
            <button
              type="button"
              onClick={confirm}
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSaving ? "Voiding..." : "Yes, void it"}
            </button>
            <button type="button" onClick={() => setIsSure(false)} className="text-sm font-medium text-tertiary/65 hover:text-tertiary">
              Keep it
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsSure(true)}
            className="rounded-lg border border-tertiary/15 px-4 py-2 text-sm font-medium text-tertiary transition-colors hover:border-primary/40 hover:text-primary"
          >
            Void desk sale
          </button>
        )}
      </div>
    </div>
  );
};

/** Every add-on order across venues, with the admin's cancel or void. */
const AddonOrdersPanel = ({ onChanged }: { onChanged: () => Promise<unknown> }) => {
  const { orders, error, isLoading, mutate } = useAdminAddonOrders();
  const [channel, setChannel] = useState("");
  const [query, setQuery] = useState("");
  const [openRef, setOpenRef] = useState<string | null>(null);

  const search = query.trim().toLowerCase();
  const rows = orders
    .filter((order) => !channel || order.channel === channel)
    .filter(
      (order) =>
        !search ||
        `${order.ref} ${order.targetRef} ${order.venue.name} ${order.member?.name ?? ""} ${order.member?.phone ?? ""}`
          .toLowerCase()
          .includes(search),
    );

  const refresh = async () => {
    setOpenRef(null);
    await Promise.all([mutate(), onChanged()]);
  };

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
        <label className="relative">
          <span className="sr-only">Search add-on orders</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary/45" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Order, member or venue"
            className="w-64 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
          />
        </label>
        <SelectField label="Filter by channel" hideLabel value={channel} onChange={setChannel} options={CHANNEL_OPTIONS} className="w-48" />
      </div>

      <div className={`${CARD} mt-4 overflow-x-auto`}>
        {isLoading ? (
          <div className="h-48 animate-pulse bg-tertiary/3" />
        ) : error ? (
          <p role="alert" className="px-6 py-14 text-center text-sm text-primary">
            We couldn&apos;t load add-on orders. Refresh to try again.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-tertiary/60">
            {orders.length === 0 ? "No add-ons sold yet." : "No add-on orders match these filters."}
          </p>
        ) : (
          <table className="w-full min-w-4xl text-left text-sm">
            <thead className="border-b border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Order</th>
                <th scope="col" className="px-5 py-3 font-semibold">Member</th>
                <th scope="col" className="px-5 py-3 font-semibold">Venue</th>
                <th scope="col" className="px-5 py-3 font-semibold">Days</th>
                <th scope="col" className="px-5 py-3 font-semibold">Add-ons</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Total</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/8">
              {rows.map((order) => {
                const isOpen = openRef === order.ref;
                const canAct = order.status === "paid";
                return (
                  <Fragment key={order.ref}>
                    <tr
                      className={cn("transition-colors", canAct && "cursor-pointer hover:bg-tertiary/3", isOpen && "bg-tertiary/3")}
                      onClick={() => canAct && setOpenRef(isOpen ? null : order.ref)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-tertiary">{order.ref}</p>
                        <p className="text-xs text-tertiary/55">For {order.targetRef}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-tertiary">{order.member?.name}</p>
                        <p className="text-xs text-tertiary/55">{order.member?.phone}</p>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-tertiary">{order.venue.name}</td>
                      <td className="px-5 py-3.5 text-tertiary/75">{datesLabel(order.dates)}</td>
                      <td className="px-5 py-3.5 text-tertiary/75">
                        {order.items.map((item) => `${item.name}${item.quantity > 1 ? ` x ${item.quantity}` : ""}`).join(", ")}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className="text-tertiary">{rupees(order.total)}</p>
                        <p className="text-xs text-tertiary/55">
                          {order.channel === "desk" ? `Desk, ${order.recordedBy?.name ?? "staff"}` : "Online"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium",
                              order.status === "paid" ? "bg-green-500/12 text-green-700" : "bg-primary/10 text-primary",
                            )}
                          >
                            {order.status === "paid" ? "Paid" : "Cancelled"}
                          </span>
                          {order.hasOpenRequest && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700">Request</span>
                          )}
                          {canAct && (
                            <ChevronDown
                              aria-hidden="true"
                              className={cn("size-4 text-tertiary/40 transition-transform", isOpen && "rotate-180")}
                            />
                          )}
                        </span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-tertiary/3">
                        <td colSpan={7} className="px-5 pb-5 pt-1">
                          <div className="max-w-xl rounded-xl border border-tertiary/10 bg-secondary p-4 shadow-sm">
                            {order.channel === "desk" ? (
                              <VoidDeskSale order={order} onDone={refresh} />
                            ) : (
                              <AdminCancelForm
                                kind="addon-order"
                                recordRef={order.ref}
                                paid={order.total}
                                hasOpenRequest={order.hasOpenRequest}
                                onDone={refresh}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {orders.length >= 200 && <p className="mt-3 text-xs text-tertiary/55">Showing the newest 200 orders.</p>}
    </>
  );
};

export default AddonOrdersPanel;
