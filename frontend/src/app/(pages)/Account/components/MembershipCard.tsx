"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Building2, CircleAlert, CircleX, Hourglass, PackagePlus, QrCode } from "lucide-react";
import DirectionsLink from "@/app/components/ui/DirectionsLink";
import { useVenue } from "@/hooks/useVenues";
import { readApiError } from "@/libs/api/errors";
import type { ApiAddonOrder } from "@/types/addonOrder";
import type { DayHours, VenueAddonOffer } from "@/types/catalogue";
import { MEMBERSHIP_STATUS_LABELS, type ApiMembership, type MembershipStatus } from "@/types/membership";
import { cn } from "@/utils";
import { invoiceToLabel } from "@/utils/companyInvoice";
import { formatDay, todayIso } from "@/utils/date";
import {
  PLAN_LENGTH_LABELS,
  PLAN_LENGTH_UNITS,
  daysLabel,
  membershipTitle,
  seatNoun,
  spaceLabel,
  windowLabel,
} from "@/utils/plans";
import { hoursOnDays, openDaysOf } from "@/utils/venueHours";
import { canBuyAddons } from "../addonOrderRules";
import { canAskToCancel, requestNotice } from "../cancelRequest";
import { paidCycleStart } from "../membershipCycle";
import AddonOrderList from "./AddonOrderList";
import CycleProgress from "./CycleProgress";
import { TICKET_LINK } from "./TicketCard";

const STATUS_STYLE: Partial<Record<MembershipStatus, string>> = {
  active: "bg-green-500/12 text-green-700",
  "past-due": "bg-amber-500/15 text-amber-700",
};

const DETAIL_LABEL = "text-sm text-tertiary/55";
const DETAIL_VALUE = "mt-0.5 text-sm text-tertiary";
const PRIMARY_ACTION =
  "cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90";

type MembershipCardProps = {
  /** A live plan; finished ones are listed in history instead. */
  membership: ApiMembership;
  onShowPass: (membership: ApiMembership) => void;
  onStopRenewal: (membership: ApiMembership) => void;
  onEditInvoice: (membership: ApiMembership) => void;
  onRequestCancel: (membership: ApiMembership) => void;
  onWithdrawRequest: (membership: ApiMembership) => Promise<void>;
  /** This plan's add-on orders that still have a day ahead. */
  addonOrders: ApiAddonOrder[];
  onBuyAddons: (membership: ApiMembership, offers: VenueAddonOffer[], hours: DayHours[]) => void;
  onRequestAddonCancel: (order: ApiAddonOrder) => void;
  onWithdrawAddonRequest: (order: ApiAddonOrder) => Promise<void>;
};

const MembershipCard = ({
  membership,
  onShowPass,
  onStopRenewal,
  onEditInvoice,
  onRequestCancel,
  onWithdrawRequest,
  addonOrders,
  onBuyAddons,
  onRequestAddonCancel,
  onWithdrawAddonRequest,
}: MembershipCardProps) => {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const request = membership.request ?? null;
  const decision = requestNotice(request);
  const isRequestOpen = request?.status === "open";
  const { venue } = useVenue(membership.venue.slug);
  const unit = PLAN_LENGTH_UNITS[membership.length];
  const seatLabel = membership.seats.map((seat) => seat.label).join(", ");
  const isPastDue = membership.status === "past-due";
  const offers = venue?.addons ?? [];
  const canAddExtras = Boolean(venue) && canBuyAddons(membership, offers, todayIso());

  return (
    <article className="rounded-2xl border border-tertiary/10 bg-secondary p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-tertiary/5 sm:size-20">
            {membership.venue.image && (
              <Image src={membership.venue.image} alt={membership.venue.name} fill sizes="80px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="text-xl font-medium text-tertiary">{membership.venue.name}</h3>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  STATUS_STYLE[membership.status] ?? "bg-tertiary/8 text-tertiary/70",
                )}
              >
                {MEMBERSHIP_STATUS_LABELS[membership.status]}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-tertiary/75">
              {membership.venue.locality}, {membership.venue.city}
            </p>
          </div>
        </div>

        <div className="sm:text-right">
          <p className="text-xl font-bold text-tertiary">
            ₹{(membership.cyclePrice / 100).toLocaleString("en-IN")}
            <span className="text-sm font-normal text-tertiary/60"> / {unit}</span>
          </p>
          <p className="mt-0.5 text-xs text-tertiary/55">
            {membership.renewsOn
              ? `Next charge ${formatDay(membership.renewsOn)}`
              : membership.paidThrough
                ? `Ends ${formatDay(membership.paidThrough)}`
                : ""}
          </p>
        </div>
      </div>

      {decision && decision.tone !== "approved" && (
        <div
          className={cn(
            "mt-4 flex flex-col gap-3 rounded-xl px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
            decision.tone === "waiting" ? "bg-amber-500/10 text-amber-900" : "bg-tertiary/5 text-tertiary/80",
          )}
        >
          <p className="flex items-start gap-2">
            {decision.tone === "waiting" ? (
              <Hourglass aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            ) : (
              <CircleX aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tertiary/50" />
            )}
            {decision.text}
          </p>
          {isRequestOpen && !request?.systemOpened && (
            <button
              type="button"
              disabled={isWithdrawing}
              onClick={async () => {
                setIsWithdrawing(true);
                setWithdrawError(null);
                try {
                  await onWithdrawRequest(membership);
                } catch (caught) {
                  setWithdrawError(readApiError(caught).message);
                } finally {
                  setIsWithdrawing(false);
                }
              }}
              className="shrink-0 text-sm font-semibold underline underline-offset-2 transition-opacity hover:opacity-75 disabled:opacity-50"
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw request"}
            </button>
          )}
        </div>
      )}

      {withdrawError && (
        <p role="alert" className="mt-2 text-sm text-primary">
          {withdrawError}
        </p>
      )}

      {isPastDue && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Your renewal payment failed. Razorpay will try again; update your card, UPI or bank mandate to keep
            your seat.
          </p>
          {membership.updatePaymentUrl && (
            <a
              href={membership.updatePaymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-amber-900 px-4 py-2 text-center text-sm font-semibold text-amber-50 shadow-sm transition-opacity hover:opacity-90"
            >
              Update payment method
            </a>
          )}
        </div>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-dashed border-tertiary/15 pt-5 lg:grid-cols-4">
        <div>
          <dt className={DETAIL_LABEL}>Plan</dt>
          <dd className={DETAIL_VALUE}>
            {membershipTitle(membership)}, {PLAN_LENGTH_LABELS[membership.length]}
          </dd>
        </div>
        <div>
          <dt className={DETAIL_LABEL}>{seatNoun(membership.spaceType, membership.seats.length)}</dt>
          <dd className={DETAIL_VALUE}>
            {spaceLabel(membership.spaceType)} {seatLabel}
          </dd>
        </div>
        <div>
          <dt className={DETAIL_LABEL}>Days</dt>
          <dd className={DETAIL_VALUE}>
            {membership.plan
              ? daysLabel(membership.plan.days)
              : venue
                ? daysLabel(openDaysOf(venue.hours))
                : "Every open day"}
          </dd>
        </div>
        {(membership.window || venue) && (
          <div>
            <dt className={DETAIL_LABEL}>{membership.window ? "Your window" : "Access"}</dt>
            <dd className={DETAIL_VALUE}>
              {membership.window ? windowLabel(membership.window) : venue && hoursOnDays(venue.hours, membership.plan?.days)}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
        <p className="flex min-w-0 items-center gap-2.5 text-sm">
          <Building2 aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <span className="text-tertiary/55">Invoices to</span>
          <span className="truncate font-medium text-tertiary">{invoiceToLabel(membership.billing) ?? "You, in your own name"}</span>
        </p>
        {membership.renewsOn && (
          <button
            type="button"
            onClick={() => onEditInvoice(membership)}
            className="text-sm font-medium text-primary transition-opacity hover:opacity-75"
          >
            Change
          </button>
        )}
      </div>

      {membership.holders.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-tertiary/55">Seat holders</span>
          {membership.holders.map((holder) => (
            <span
              key={holder.seatId}
              className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/10 bg-surface py-1 pl-1 pr-3 text-xs text-tertiary"
            >
              <span className="rounded-full bg-orange-500/15 px-2 py-0.5 font-semibold text-orange-800">
                {membership.seats.find((seat) => seat.id === holder.seatId)?.label ?? holder.seatId}
              </span>
              {holder.name}
            </span>
          ))}
        </div>
      )}

      {membership.paidThrough && (
        <div className="mt-5">
          <CycleProgress
            label="Paid period"
            start={paidCycleStart(membership.startDate, unit, membership.paidThrough)}
            end={membership.paidThrough}
          />
        </div>
      )}

      {addonOrders.length > 0 && (
        <AddonOrderList
          orders={addonOrders}
          onRequestCancel={onRequestAddonCancel}
          onWithdrawRequest={onWithdrawAddonRequest}
        />
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-tertiary/8 pt-5">
        <button type="button" onClick={() => onShowPass(membership)} className={PRIMARY_ACTION}>
          <QrCode aria-hidden="true" className="size-4" />
          Show member pass
        </button>
        {canAddExtras && venue && (
          <button
            type="button"
            onClick={() => onBuyAddons(membership, offers, venue.hours)}
            className="inline-flex items-center gap-2 rounded-lg border border-tertiary/15 bg-secondary px-4 py-2.5 text-sm font-medium text-tertiary shadow-sm transition-all hover:-translate-y-0.5 hover:border-tertiary/30 hover:shadow-md"
          >
            <PackagePlus aria-hidden="true" className="size-4 text-primary" />
            Buy add-ons
          </button>
        )}
        {venue?.googleMapsUrl && <DirectionsLink url={venue.googleMapsUrl} label="Directions" />}
        <Link href={`/workspaces/${membership.venue.slug}`} className={cn(TICKET_LINK, "inline-flex items-center gap-1")}>
          View workspace
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <span className="ml-auto flex flex-wrap items-center gap-4">
          {membership.renewsOn && (
            <button
              type="button"
              onClick={() => onStopRenewal(membership)}
              className="text-sm font-medium text-tertiary/60 underline underline-offset-4 transition-colors hover:text-primary"
            >
              Stop renewing
            </button>
          )}
          {canAskToCancel(membership.status, request) && (
            <button
              type="button"
              onClick={() => onRequestCancel(membership)}
              className="text-sm font-medium text-tertiary/60 underline underline-offset-4 transition-colors hover:text-primary"
            >
              Ask to cancel
            </button>
          )}
        </span>
      </div>
    </article>
  );
};

export default MembershipCard;
