"use client";

import Link from "next/link";
import { StaffBookingNote, useIsStaff } from "@/app/components/shared/CustomerOnly";
import type { VenueDetail } from "@/types/venue";
import MembershipCheckout from "./MembershipCheckout";
import PassCheckout from "./PassCheckout";
import { useBookingSelection } from "./useBookingSelection";

const PaymentPage = ({ venue }: { venue: VenueDetail }) => {
  const { selection, isHydrated } = useBookingSelection(venue);
  const isStaff = useIsStaff();

  if (!isHydrated) {
    return (
      <div className="bg-surface pt-28 lg:pt-32">
        <div className="mx-auto h-96 w-full max-w-7xl animate-pulse rounded-2xl px-4 sm:px-6" />
      </div>
    );
  }

  if (isStaff) {
    return (
      <div className="bg-surface pb-20 pt-28 lg:pt-32">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl border border-tertiary/10 bg-secondary px-6 py-14 text-center">
            <StaffBookingNote className="justify-center" />
            <Link href={`/workspaces/${venue.slug}`} className="mt-4 inline-block text-sm font-medium text-primary">
              Back to {venue.name}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return selection.planId ? <MembershipCheckout venue={venue} /> : <PassCheckout venue={venue} />;
};

export default PaymentPage;
