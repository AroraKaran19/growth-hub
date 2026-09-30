import type { Metadata } from "next";
import ResetPasswordPage from "../../(pages)/StaffAuth/ResetPasswordPage";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function AdminResetPassword() {
  return <ResetPasswordPage surface="admin" />;
}
