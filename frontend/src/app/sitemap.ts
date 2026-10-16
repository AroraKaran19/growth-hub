import type { MetadataRoute } from "next";
import { getPublishedVenues } from "@/libs/api/venues";
import { loadSeo, siteUrlOf } from "@/libs/seo";

const PAGES = [
  { path: "", priority: 1 },
  { path: "/workspaces", priority: 0.9 },
  { path: "/locations", priority: 0.8 },
  { path: "/memberships", priority: 0.8 },
  { path: "/pricing", priority: 0.7 },
  { path: "/about", priority: 0.5 },
  { path: "/contact", priority: 0.5 },
  { path: "/support", priority: 0.5 },
  { path: "/faqs", priority: 0.5 },
  { path: "/privacy", priority: 0.2 },
  { path: "/terms", priority: 0.2 },
  { path: "/cancellation-policy", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ seo }, venues] = await Promise.all([loadSeo(), getPublishedVenues()]);
  if (seo.hideFromSearch) return [];
  const base = siteUrlOf(seo);
  return [
    ...PAGES.map((page) => ({ url: `${base}${page.path}`, changeFrequency: "weekly" as const, priority: page.priority })),
    ...venues.map((venue) => ({ url: `${base}/workspaces/${venue.slug}`, changeFrequency: "daily" as const, priority: 0.9 })),
  ];
}
