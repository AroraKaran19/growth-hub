import type { ReactNode } from "react";
import {
  PARTNER_BOOKING_STATUS_LABELS,
  type PartnerBookingStatus,
} from "@/types/partner";
import { cn } from "@/utils";

export const PARTNER_CARD =
  "rounded-2xl border border-tertiary/10 bg-secondary";

export const CHECK_IN_BUTTON =
  "cta-gradient inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-secondary transition-opacity hover:opacity-90";

type PartnerPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export const PartnerPageHeader = ({
  title,
  description,
  actions,
}: PartnerPageHeaderProps) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-tertiary">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-tertiary/60">{description}</p>
      )}
    </div>
    {actions}
  </div>
);

const STATUS_STYLE: Record<PartnerBookingStatus, string> = {
  upcoming: "bg-amber-500/15 text-amber-700",
  "checked-in": "bg-blue-600/12 text-blue-700",
  completed: "bg-tertiary/8 text-tertiary/70",
  cancelled: "bg-primary/10 text-primary",
  "no-show": "bg-tertiary/8 text-tertiary/55",
};

export const BookingStatusBadge = ({
  status,
}: {
  status: PartnerBookingStatus;
}) => (
  <span
    className={cn(
      "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
      STATUS_STYLE[status],
    )}
  >
    {PARTNER_BOOKING_STATUS_LABELS[status]}
  </span>
);

export const PartnerStat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl border border-tertiary/10 border-b-2 border-b-primary bg-secondary px-4 py-3.5">
    <dt className="text-sm text-tertiary/60">{label}</dt>
    <dd className="mt-1 text-2xl font-bold text-tertiary">{value}</dd>
    {hint && <dd className="text-xs text-tertiary/50">{hint}</dd>}
  </div>
);

export const PartnerSkeleton = () => (
  <div
    aria-busy="true"
    aria-label="Loading"
    className="h-96 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary"
  />
);
