import { Suspense } from "react";
import type { Metadata } from "next";
import AdminAvailabilityPage from "../../../(pages)/Admin/AdminAvailabilityPage";

export const metadata: Metadata = {
  title: "Availability",
};

export default function AdminAvailability() {
  return (
    // useSearchParams needs a Suspense boundary or the production build fails
    // on this statically rendered route.
    <Suspense fallback={null}>
      <AdminAvailabilityPage />
    </Suspense>
  );
}
