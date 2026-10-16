import type { Metadata } from "next";
import AdminAnalyticsPage from "../../../(pages)/Admin/AdminAnalyticsPage";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AdminAnalytics() {
  return <AdminAnalyticsPage />;
}
