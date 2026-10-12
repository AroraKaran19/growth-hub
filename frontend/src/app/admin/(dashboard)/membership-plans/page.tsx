import { Suspense } from "react";
import type { Metadata } from "next";
import AdminMembershipPlansPage from "../../../(pages)/Admin/AdminMembershipPlansPage";

export const metadata: Metadata = {
  title: "Membership plans",
};

export default function AdminMembershipPlans() {
  return (
    // useSearchParams needs a Suspense boundary or the production build fails.
    <Suspense fallback={null}>
      <AdminMembershipPlansPage />
    </Suspense>
  );
}
