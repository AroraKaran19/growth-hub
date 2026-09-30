"use client";

import { useState } from "react";
import { CalendarDays, Hourglass, PackageCheck } from "lucide-react";
import { readApiError } from "@/libs/api/errors";
import type { ApiAddonOrder } from "@/types/addonOrder";
import { cn } from "@/utils";
import { rupees } from "../../Booking/checkoutState";
import { datesLabel } from "../addonOrderRules";
import { requestNotice } from "../cancelRequest";
import VenueRemovedNotice from "./VenueRemovedNotice";

type AddonOrderListProps = {
  orders: ApiAddonOrder[];
  onRequestCancel: (order: ApiAddonOrder) => void;
  onWithdrawRequest: (order: ApiAddonOrder) => Promise<void>;
};

const OrderTile = ({ order, onRequestCancel, onWithdrawRequest }: { order: ApiAddonOrder } & Omit<AddonOrderListProps, "orders">) => {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = order.request ?? null;
  const notice = requestNotice(request);
  const isCancelled = order.status === "cancelled";

  return (
    <li className={cn("rounded-xl border border-tertiary/10 bg-surface p-4", isCancelled && "opacity-75")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-tertiary">
            <CalendarDays aria-hidden="true" className="size-4 text-tertiary/50" />
            {datesLabel(order.dates)}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {order.items.map((item) => (
              <li key={item.key} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-tertiary/75 shadow-sm">
                {item.name}
                {item.quantity > 1 ? ` x ${item.quantity}` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-right">
          <p className={cn("text-base font-bold text-tertiary", isCancelled && "line-through decoration-tertiary/40")}>
            {rupees(order.total)}
          </p>
          <p className="text-xs text-tertiary/55">{order.channel === "desk" ? "Paid at the desk" : "Paid online"}</p>
        </div>
      </div>

      {order.venueRemoval && <VenueRemovedNotice notice={order.venueRemoval} className="mt-3 text-xs" />}

      {notice && (
        <p
          className={cn(
            "mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
            notice.tone === "waiting" ? "bg-amber-500/10 text-amber-900" : "bg-tertiary/5 text-tertiary/75",
          )}
        >
          {notice.tone === "waiting" && <Hourglass aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />}
          {notice.text}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-primary">
          {error}
        </p>
      )}

      {(order.canRequestCancel || (request?.status === "open" && !request.systemOpened)) && (
        <div className="mt-3 flex justify-end">
          {order.canRequestCancel ? (
            <button
              type="button"
              onClick={() => onRequestCancel(order)}
              className="text-xs font-medium text-tertiary/60 underline underline-offset-4 transition-colors hover:text-primary"
            >
              Ask to cancel
            </button>
          ) : (
            <button
              type="button"
              disabled={isWithdrawing}
              onClick={async () => {
                setIsWithdrawing(true);
                setError(null);
                try {
                  await onWithdrawRequest(order);
                } catch (caught) {
                  setError(readApiError(caught).message);
                } finally {
                  setIsWithdrawing(false);
                }
              }}
              className="text-xs font-semibold text-tertiary/75 underline underline-offset-4 hover:text-tertiary disabled:opacity-50"
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw request"}
            </button>
          )}
        </div>
      )}
    </li>
  );
};

/** The add-ons bought for one plan that still have a day ahead. */
const AddonOrderList = ({ orders, ...actions }: AddonOrderListProps) => (
  <section className="mt-5 border-t border-tertiary/8 pt-5" aria-label="Add-ons">
    <h4 className="flex items-center gap-2 text-sm font-semibold text-tertiary">
      <PackageCheck aria-hidden="true" className="size-4 text-primary" />
      Your add-ons
    </h4>
    <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
      {orders.map((order) => (
        <OrderTile key={order.ref} order={order} {...actions} />
      ))}
    </ul>
  </section>
);

export default AddonOrderList;
