"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer } from "lucide-react";
import Logo from "@/app/components/ui/Logo";
import { CONTACT } from "@/data/footer";
import { MEMBER } from "@/data/member";
import { useMemberBookings } from "@/stores/bookings";
import { useSession } from "@/stores/session";
import type { MemberBooking } from "@/types/memberBooking";
import { formatDay } from "@/utils/date";

// Listed prices include GST, so the invoice backs it out rather than adding it.
const GST_RATE = 0.18;

const rupees = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type InvoicePageProps = {
  bookingId: string;
  issuedBooking?: MemberBooking;
};

const InvoicePage = ({ bookingId, issuedBooking }: InvoicePageProps) => {
  const { bookings, isHydrated } = useMemberBookings();
  const { session } = useSession();

  const booking =
    bookings.find((item) => item.bookingId === bookingId) ?? issuedBooking;

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        {isHydrated ? (
          <div className="max-w-sm text-center">
            <p className="text-base font-semibold text-tertiary">
              Invoice not found
            </p>
            <p className="mt-2 text-sm text-tertiary/60">
              We couldn&apos;t find a booking with ID {bookingId}.
            </p>
            <Link
              href="/account/bookings"
              className="mt-5 inline-block text-sm font-medium text-primary"
            >
              Back to My Bookings
            </Link>
          </div>
        ) : (
          <p className="text-sm text-tertiary/60">Loading invoice...</p>
        )}
      </div>
    );
  }

  const taxable = booking.total / (1 + GST_RATE);
  const gst = booking.total - taxable;
  const quantity = Math.max(booking.seats.length, 1);

  return (
    <div className="min-h-screen bg-surface px-4 py-8 print:bg-secondary print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/account/bookings/${booking.bookingId}`}
          className="inline-flex items-center gap-2 text-sm text-tertiary/60 transition-colors hover:text-tertiary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to booking
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
        >
          <Printer aria-hidden="true" className="size-4" />
          Print or save as PDF
        </button>
      </div>

      <article className="mx-auto max-w-3xl rounded-2xl border border-tertiary/10 bg-secondary p-6 sm:p-10 print:rounded-none print:border-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-tertiary/10 pb-6">
          <div>
            <Logo className="h-12 w-auto text-tertiary" />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-tertiary/55">
              {CONTACT.address}
            </p>
            <p className="text-xs text-tertiary/55">{CONTACT.email}</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-tertiary">Tax Invoice</h1>
            <p className="mt-1 font-mono text-sm text-tertiary/60">
              INV-{booking.bookingId}
            </p>
            <span
              className={
                booking.status === "cancelled"
                  ? "mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  : "mt-2 inline-block rounded-full bg-green-500/12 px-3 py-1 text-xs font-medium text-green-700"
              }
            >
              {booking.status === "cancelled" ? "Cancelled" : "Paid"}
            </span>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 border-b border-tertiary/10 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-tertiary/50">
              Billed to
            </h2>
            <p className="mt-2 text-sm font-medium text-tertiary">
              {session?.name ?? MEMBER.name}
            </p>
            <p className="text-sm text-tertiary/65">{MEMBER.companyName}</p>
            <p className="text-sm text-tertiary/65">{MEMBER.billingEmail}</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-tertiary/50">
              Workspace
            </h2>
            <p className="mt-2 text-sm font-medium text-tertiary">
              {booking.venueName}
            </p>
            <p className="text-sm text-tertiary/65">
              {booking.locality}, {booking.city}
            </p>
            <p className="text-sm text-tertiary/65">
              {formatDay(booking.startDate)}, {booking.time}
            </p>
          </div>
        </section>

        <div className="overflow-x-auto py-6">
          <table className="w-full min-w-md text-left text-sm">
            <thead>
              <tr className="border-b border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
                <th scope="col" className="pb-3 font-semibold">
                  Description
                </th>
                <th scope="col" className="pb-3 text-right font-semibold">
                  Qty
                </th>
                <th scope="col" className="pb-3 text-right font-semibold">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-tertiary/8">
                <td className="py-3 text-tertiary">
                  {booking.type}
                  <span className="block text-xs text-tertiary/55">
                    Seats {booking.seats.join(", ")}
                  </span>
                </td>
                <td className="py-3 text-right text-tertiary">{quantity}</td>
                <td className="py-3 text-right text-tertiary">
                  {rupees(taxable)}
                </td>
              </tr>
            </tbody>
          </table>

          <dl className="ml-auto mt-4 flex max-w-xs flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-tertiary/60">Taxable value</dt>
              <dd className="text-tertiary">{rupees(taxable)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-tertiary/60">
                GST ({Math.round(GST_RATE * 100)}%)
              </dt>
              <dd className="text-tertiary">{rupees(gst)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-tertiary/10 pt-2 text-base font-bold">
              <dt className="text-tertiary">Total</dt>
              <dd className="text-tertiary">{rupees(booking.total)}</dd>
            </div>
            {booking.refund !== undefined && (
              <div className="flex justify-between gap-4">
                <dt className="text-tertiary/60">Refunded</dt>
                <dd className="text-green-700">-{rupees(booking.refund)}</dd>
              </div>
            )}
          </dl>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-tertiary/10 pt-6">
          <div className="flex items-center gap-4">
            <QRCodeSVG
              value={`growthhub:booking:${booking.bookingId}`}
              size={72}
              level="M"
              aria-label={`Check-in QR for booking ${booking.bookingId}`}
            />
            <p className="max-w-56 text-xs leading-relaxed text-tertiary/55">
              Show this code at reception to check in. Booking ID{" "}
              <span className="font-mono text-tertiary">
                {booking.bookingId}
              </span>
              .
            </p>
          </div>
          <p className="text-xs text-tertiary/45">
            A computer generated invoice. No signature needed.
          </p>
        </footer>
      </article>
    </div>
  );
};

export default InvoicePage;
