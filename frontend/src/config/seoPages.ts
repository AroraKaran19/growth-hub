import type { SeoPage } from "@/types/homeContent";

/** Each public page's built-in search copy; Site settings can override any of it. */
export const SEO_PAGE_COPY: Record<SeoPage, { label: string; path: string; title: string; description: string }> = {
  home: { label: "Home", path: "/", title: "", description: "" },
  workspaces: {
    label: "Workspaces",
    path: "/workspaces",
    title: "Workspaces",
    description: "Browse coworking spaces, meeting rooms and private offices from Growth Hub partner venues across Bangalore.",
  },
  locations: {
    label: "Locations",
    path: "/locations",
    title: "Locations",
    description: "Find Growth Hub partner workspaces in Koramangala, HSR Layout, Indiranagar and more neighbourhoods across Bangalore.",
  },
  memberships: {
    label: "Memberships",
    path: "/memberships",
    title: "Memberships",
    description: "Reserve a desk, cabin, office or meeting room at a Growth Hub partner venue with each venue's membership plans.",
  },
  pricing: {
    label: "Pricing",
    path: "/pricing",
    title: "Pricing",
    description: "Hourly, half-day and full-day passes and membership plans at Growth Hub partner venues.",
  },
  about: {
    label: "About",
    path: "/about",
    title: "About",
    description: "Growth Hub is a coworking marketplace connecting members with partner venues across Bangalore.",
  },
  contact: {
    label: "Contact",
    path: "/contact",
    title: "Contact",
    description: "Contact Growth Hub about bookings, memberships, payments or listing your coworking space.",
  },
  support: {
    label: "Help Center",
    path: "/support",
    title: "Help Center",
    description: "Get help with Growth Hub bookings, refunds, memberships, check-in and your account.",
  },
  faqs: {
    label: "FAQs",
    path: "/faqs",
    title: "FAQs",
    description: "Answers to common questions about Growth Hub bookings, payments, memberships, check-in and accounts.",
  },
};
