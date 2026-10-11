import type { Metadata } from "next";
import AdminTestimonialsPage from "../../../(pages)/Admin/AdminTestimonialsPage";

export const metadata: Metadata = {
  title: "Testimonials",
};

export default function AdminTestimonials() {
  return <AdminTestimonialsPage />;
}
