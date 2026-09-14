import type { Metadata } from "next";
import AdminCouponsPage from "../../../(pages)/Admin/AdminCouponsPage";

export const metadata: Metadata = {
  title: "Coupons",
};

export default function AdminCoupons() {
  return <AdminCouponsPage />;
}
