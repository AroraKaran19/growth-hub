import type { Plan } from "@/types/plan";

// MOCK DATA until the plans API exists.
export const PLANS: Plan[] = [
  {
    number: "01",
    name: "Workspace Passes",
    description: "For most businesses that want to optimize web queries",
    options: ["Hourly", "Half Day", "Full day"],
    price: 200,
    originalPrice: 300,
    discountPercent: 50,
    ctaLabel: "Explore",
    ctaHref: "/workspaces",
  },
  {
    number: "02",
    name: "Membership",
    description: "Make Growth Hub your workspace.",
    options: ["1 Week", "1 Month", "3 Months", "6 Months"],
    price: 200,
    originalPrice: 300,
    discountPercent: 50,
    ctaLabel: "View Plans",
    ctaHref: "/memberships",
    isPopular: true,
  },
  {
    number: "03",
    name: "Meeting spaces",
    description: "For most businesses that want to optimize web queries",
    options: ["Meeting Rooms", "Conference Rooms", "Boardrooms"],
    price: 200,
    originalPrice: 300,
    discountPercent: 50,
    ctaLabel: "Explore",
    ctaHref: "/workspaces?type=meeting-room",
  },
];
