"use client";

import { useState } from "react";
import { BadgeIndianRupee, CalendarDays, MailCheck, ReceiptText } from "lucide-react";
import { useCustomerRecords, type CustomerBooking, type CustomerInvoice, type CustomerMembership } from "@/hooks/useCustomerRecords";
import { viewCustomerInvoice } from "@/libs/api/invoices";
import type { ApiBookingStatus } from "@/types/apiBooking";
import type { InvoiceKind } from "@/types/invoice";
import { MEMBERSHIP_STATUS_LABELS, type MembershipStatus } from "@/types/membership";
import { formatDay } from "@/utils/date";
import { cycleUnit, lengthName, spaceName } from "@/utils/membershipLabels";
import { InvoiceButton, RecordsTable, rupees, StatusPill, type Column } from "./recordsUi";
import { indiaDay } from "./userKinds";

const BOOKING_STATUS: Record<ApiBookingStatus, { label: string; style: string }> = {
  "pending-payment": { label: "Awaiting payment", style: "bg-tertiary/8 text-tertiary/70" },
  upcoming: { label: "Upcoming", style: "bg-green-500/12 text-green-700" },
  "checked-in": { label: "Checked in", style: "bg-blue-600/12 text-blue-700" },
  completed: { label: "Completed", style: "bg-tertiary/8 text-tertiary/70" },
  "no-show": { label: "No show", style: "bg-amber-500/15 text-amber-700" },
  cancelled: { label: "Cancelled", style: "bg-primary/10 text-primary" },
  expired: { label: "Not completed", style: "bg-tertiary/8 text-tertiary/70" },
};

const MEMBERSHIP_STYLE: Record<MembershipStatus, string> = {
  "pending-payment": "bg-tertiary/8 text-tertiary/70",
  active: "bg-green-500/12 text-green-700",
  "past-due": "bg-amber-500/15 text-amber-700",
  ended: "bg-tertiary/8 text-tertiary/70",
  lapsed: "bg-primary/10 text-primary",
  cancelled: "bg-primary/10 text-primary",
  expired: "bg-tertiary/8 text-tertiary/70",
};

const INVOICE_STATUS: Record<CustomerInvoice["status"], { label: string; style: string }> = {
  ready: { label: "Ready", style: "bg-green-500/12 text-green-700" },
  preparing: { label: "Preparing", style: "bg-amber-500/12 text-amber-800" },
  failed: { label: "Failed", style: "bg-primary/10 text-primary" },
};

const INVOICE_KIND: Record<InvoiceKind, string> = {
  booking: "Pass",
  "membership-charge": "Membership",
  "addon-order": "Add-ons",
};

const PASS_LABEL = { hourly: "Hourly pass", "half-day": "Half-day pass", "full-day": "Full-day pass" } as const;

const MUTED = "text-xs text-tertiary/50";

const seatsLabel = (seats: string[]) => (seats.length ? seats.join(", ") : "No seat");

const membershipTitle = (membership: CustomerMembership) =>
  membership.planName ?? `${spaceName(membership.spaceType)}, ${lengthName(membership.length)}`;

const bookingBlocked = (booking: CustomerBooking) =>
  !booking.invoiceId ? "No invoice yet" : booking.invoiceReady ? undefined : "Being prepared";

const invoiceBlocked = (invoice: CustomerInvoice) =>
  invoice.status === "ready" ? undefined : invoice.status === "failed" ? "Not available yet" : "Being prepared";

type PanelProps = { customerId: string };

export const BookingsPanel = ({ customerId }: PanelProps) => {
  const [page, setPage] = useState(1);
  const records = useCustomerRecords(customerId, "bookings", page);
  const open = (booking: CustomerBooking) => void viewCustomerInvoice(customerId, booking.invoiceId!);
  const status = (booking: CustomerBooking) => <StatusPill {...BOOKING_STATUS[booking.status]} />;
  const invoice = (booking: CustomerBooking) => (
    <InvoiceButton id={booking.ref} blockedReason={bookingBlocked(booking)} onOpen={() => open(booking)} />
  );

  const columns: Column<CustomerBooking>[] = [
    {
      header: "Booking",
      cell: (booking) => (
        <>
          <p className="font-medium text-tertiary">{booking.venueName}</p>
          <p className={`${MUTED} font-mono`}>{booking.ref}</p>
        </>
      ),
    },
    {
      header: "When",
      className: "whitespace-nowrap",
      cell: (booking) => (
        <>
          <p className="text-tertiary/85">{formatDay(booking.date)}</p>
          <p className={MUTED}>{booking.timeLabel}</p>
        </>
      ),
    },
    {
      header: "Seats",
      cell: (booking) => (
        <>
          <p className="text-tertiary/85">{seatsLabel(booking.seats)}</p>
          <p className={MUTED}>{PASS_LABEL[booking.passType]}</p>
        </>
      ),
    },
    { header: "Amount", className: "whitespace-nowrap tabular-nums text-tertiary", cell: (booking) => rupees(booking.amount) },
    { header: "Status", cell: status },
    { header: "Invoice", srOnly: true, className: "text-right", cell: invoice },
  ];

  return (
    <RecordsTable
      label="Bookings"
      {...records}
      columns={columns}
      keyOf={(booking) => booking.ref}
      empty={{ icon: CalendarDays, text: "No bookings yet." }}
      onPage={setPage}
      card={(booking) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-tertiary">{booking.venueName}</p>
            <p className="text-sm text-tertiary/70">
              {formatDay(booking.date)} · {booking.timeLabel}
            </p>
            <p className={MUTED}>
              {seatsLabel(booking.seats)} · {rupees(booking.amount)} · <span className="font-mono">{booking.ref}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {status(booking)}
            {invoice(booking)}
          </div>
        </div>
      )}
    />
  );
};

export const MembershipsPanel = ({ customerId }: PanelProps) => {
  const [page, setPage] = useState(1);
  const records = useCustomerRecords(customerId, "memberships", page);
  const status = (membership: CustomerMembership) => (
    <StatusPill label={MEMBERSHIP_STATUS_LABELS[membership.status]} style={MEMBERSHIP_STYLE[membership.status]} />
  );
  const paidThrough = (membership: CustomerMembership) =>
    membership.paidThrough ? `Paid through ${formatDay(membership.paidThrough)}` : "Not paid yet";

  const columns: Column<CustomerMembership>[] = [
    {
      header: "Membership",
      cell: (membership) => (
        <>
          <p className="font-medium text-tertiary">{membershipTitle(membership)}</p>
          <p className={`${MUTED} font-mono`}>{membership.ref}</p>
        </>
      ),
    },
    {
      header: "Venue",
      cell: (membership) => (
        <>
          <p className="text-tertiary/85">{membership.venueName}</p>
          <p className={MUTED}>{seatsLabel(membership.seats)}</p>
        </>
      ),
    },
    {
      header: "Period",
      className: "whitespace-nowrap",
      cell: (membership) => (
        <>
          <p className="text-tertiary/85">From {formatDay(membership.startDate)}</p>
          <p className={MUTED}>{paidThrough(membership)}</p>
        </>
      ),
    },
    {
      header: "Price",
      className: "whitespace-nowrap tabular-nums",
      cell: (membership) => (
        <p className="text-tertiary">
          {rupees(membership.cyclePrice)}
          <span className={MUTED}> / {cycleUnit(membership.length)}</span>
        </p>
      ),
    },
    { header: "Status", cell: status },
  ];

  return (
    <RecordsTable
      label="Memberships"
      {...records}
      columns={columns}
      keyOf={(membership) => membership.ref}
      empty={{ icon: BadgeIndianRupee, text: "No memberships yet." }}
      onPage={setPage}
      card={(membership) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-tertiary">{membershipTitle(membership)}</p>
            <p className="text-sm text-tertiary/70">
              {membership.venueName} · {seatsLabel(membership.seats)}
            </p>
            <p className={MUTED}>
              {rupees(membership.cyclePrice)} / {cycleUnit(membership.length)} · {paidThrough(membership)}
            </p>
            <p className={`${MUTED} font-mono`}>{membership.ref}</p>
          </div>
          <div className="shrink-0">{status(membership)}</div>
        </div>
      )}
    />
  );
};

export const InvoicesPanel = ({ customerId }: PanelProps) => {
  const [page, setPage] = useState(1);
  const records = useCustomerRecords(customerId, "invoices", page);
  const status = (invoice: CustomerInvoice) => (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusPill {...INVOICE_STATUS[invoice.status]} />
      {invoice.emailed && (
        <span className="inline-flex items-center gap-1 text-xs text-tertiary/55">
          <MailCheck aria-hidden="true" className="size-3.5" />
          Emailed
        </span>
      )}
    </span>
  );
  const button = (invoice: CustomerInvoice) => (
    <InvoiceButton
      id={invoice.id}
      blockedReason={invoiceBlocked(invoice)}
      onOpen={() => void viewCustomerInvoice(customerId, invoice.id)}
    />
  );

  const columns: Column<CustomerInvoice>[] = [
    {
      header: "Invoice",
      className: "whitespace-nowrap",
      cell: (invoice) => (
        <>
          <p className="font-mono text-tertiary">{invoice.number}</p>
          <p className={MUTED}>
            {INVOICE_KIND[invoice.kind]} · {formatDay(indiaDay(invoice.date))}
          </p>
        </>
      ),
    },
    {
      header: "For",
      cell: (invoice) => (
        <>
          <p className="text-tertiary/85">{invoice.reference}</p>
          <p className={MUTED}>{invoice.description}</p>
        </>
      ),
    },
    { header: "Total", className: "whitespace-nowrap tabular-nums text-tertiary", cell: (invoice) => rupees(invoice.total) },
    { header: "Status", cell: status },
    { header: "Open", srOnly: true, className: "text-right", cell: button },
  ];

  return (
    <RecordsTable
      label="Invoices"
      {...records}
      columns={columns}
      keyOf={(invoice) => invoice.id}
      empty={{ icon: ReceiptText, text: "No invoices yet." }}
      onPage={setPage}
      card={(invoice) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm text-tertiary">{invoice.number}</p>
            <p className="text-sm text-tertiary/70">{invoice.reference}</p>
            <p className={MUTED}>
              {formatDay(indiaDay(invoice.date))} · {rupees(invoice.total)}
            </p>
            <div className="mt-1.5">{status(invoice)}</div>
          </div>
          <div className="shrink-0">{button(invoice)}</div>
        </div>
      )}
    />
  );
};
