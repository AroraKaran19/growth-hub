"use client";

import { MapPin } from "lucide-react";
import { usePartnerVenue } from "@/hooks/useVenues";
import StaffProfilePage from "../Staff/StaffProfilePage";

const PartnerProfilePage = () => {
  const { venue } = usePartnerVenue();

  return (
    <StaffProfilePage
      surface="partner"
      roleLabel="Venue partner"
      emailNote="Growth Hub changes it for you. Contact your account manager."
      access={
        <p className="inline-flex items-center gap-1.5 text-sm text-secondary/75">
          <MapPin aria-hidden="true" className="size-4 text-primary" />
          {venue ? `${venue.name}, ${venue.locality}` : "Your venue"}
        </p>
      }
    />
  );
};

export default PartnerProfilePage;
