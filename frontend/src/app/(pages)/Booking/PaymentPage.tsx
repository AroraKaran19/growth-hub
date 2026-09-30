"use client";

import { isMembershipType } from "@/types/booking";
import type { VenueDetail } from "@/types/venue";
import MembershipCheckout from "./MembershipCheckout";
import PassCheckout from "./PassCheckout";
import { useBookingSelection } from "./useBookingSelection";

const PaymentPage = ({ venue }: { venue: VenueDetail }) => {
  const { selection, isHydrated } = useBookingSelection(venue);

  if (!isHydrated) {
    return (
      <div className="bg-surface pt-28 lg:pt-32">
        <div className="mx-auto h-96 w-full max-w-7xl animate-pulse rounded-2xl px-4 sm:px-6" />
      </div>
    );
  }

  return isMembershipType(selection.bookingType) ? (
    <MembershipCheckout venue={venue} />
  ) : (
    <PassCheckout venue={venue} />
  );
};

export default PaymentPage;
