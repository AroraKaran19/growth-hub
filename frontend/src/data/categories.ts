import type { WorkspaceCategory } from "@/types/category";

// MOCK DATA until the venues API exists.
export const CATEGORIES: WorkspaceCategory[] = [
  {
    slug: "hot-desk",
    name: "Open Desk",
    description:
      "Flexible shared workspace for focused individual productivity.",
    image: "/assets/home/categories/categories-1.webp",
  },
  {
    slug: "private-cabin",
    name: "Private Cabin",
    description: "Enclosed room for your team, with the door shut and the noise out.",
    image: "/assets/home/categories/categories-2.webp",
  },
  {
    slug: "dedicated-desk",
    name: "Dedicated Desk",
    description: "Your own desk, kept exactly as you left it, month after month.",
    image: "/assets/home/categories/categories-3.webp",
  },
  {
    slug: "meeting-room",
    name: "Meeting Room",
    description: "Book by the hour for client calls, interviews and workshops.",
    image: "/assets/home/categories/categories-4.webp",
  },
];
