export type Role = {
  id: string;
  title: string;
  team: string;
  location: string;
  type: "Full-time" | "Internship";
  summary: string;
  responsibilities: string[];
  requirements: string[];
};

// MOCK DATA until roles come from a careers system.
export const ROLES: Role[] = [
  {
    id: "partner-success-manager",
    title: "Partner Success Manager",
    team: "Partnerships",
    location: "Bengaluru, on site",
    type: "Full-time",
    summary:
      "Own the relationship with our partner venues, from onboarding a new space to keeping its seats full.",
    responsibilities: [
      "Onboard new venues, including floor plan mapping and pricing setup",
      "Review occupancy with partners every month and plan improvements",
      "Resolve escalations between members and venues quickly and fairly",
    ],
    requirements: [
      "3+ years in account management, hospitality or real estate",
      "Comfortable visiting venues across Bangalore every week",
      "Clear written and spoken English; Kannada or Hindi is a plus",
    ],
  },
  {
    id: "frontend-engineer",
    title: "Frontend Engineer",
    team: "Engineering",
    location: "Bengaluru, hybrid",
    type: "Full-time",
    summary:
      "Build the booking, membership and partner experiences that thousands of people use every day.",
    responsibilities: [
      "Ship features across the member site and partner dashboard",
      "Keep interfaces fast, accessible and consistent with our design system",
      "Work closely with design and product from idea to release",
    ],
    requirements: [
      "Strong React and TypeScript experience",
      "An eye for detail in layout, motion and accessibility",
      "Experience with Next.js App Router is a plus",
    ],
  },
  {
    id: "product-designer",
    title: "Product Designer",
    team: "Design",
    location: "Bengaluru, hybrid",
    type: "Full-time",
    summary:
      "Design end to end flows for members and partners, from first search to daily check-in.",
    responsibilities: [
      "Turn research and data into clear, simple flows",
      "Maintain and extend the Growth Hub design system",
      "Test ideas with members and venue staff",
    ],
    requirements: [
      "A portfolio showing shipped product work",
      "Confidence with interaction design and visual detail",
      "Experience designing for mobile first",
    ],
  },
  {
    id: "community-associate",
    title: "Community Associate",
    team: "Operations",
    location: "Koramangala, on site",
    type: "Full-time",
    summary:
      "Be the friendly face for members at our busiest partner venues and make every check-in smooth.",
    responsibilities: [
      "Help members check in and find their seats",
      "Run small community events with our partners",
      "Share member feedback with the product team",
    ],
    requirements: [
      "1+ year in customer-facing roles",
      "Calm under pressure and genuinely enjoys helping people",
      "Available on a rotating weekday roster",
    ],
  },
  {
    id: "growth-marketing-intern",
    title: "Growth Marketing Intern",
    team: "Marketing",
    location: "Bengaluru, hybrid",
    type: "Internship",
    summary:
      "Help more people discover Growth Hub through content, partnerships and campaigns. Six months.",
    responsibilities: [
      "Write neighbourhood guides and social posts",
      "Set up and measure small campaigns",
      "Research new localities and venue partners",
    ],
    requirements: [
      "A final-year student or recent graduate",
      "Strong writing and a curiosity for data",
      "Familiar with at least one analytics tool",
    ],
  },
];

export const PERKS = [
  {
    title: "Work from any partner venue",
    text: "A membership at the venue of your choice, on us.",
  },
  {
    title: "Health cover",
    text: "Medical insurance for you and your immediate family.",
  },
  {
    title: "Learning budget",
    text: "An annual allowance for courses, books and conferences.",
  },
  {
    title: "Flexible hours",
    text: "Plan your day around deep work, not a fixed clock.",
  },
  {
    title: "Ownership",
    text: "Stock options for full-time team members.",
  },
  {
    title: "Time to recharge",
    text: "Generous leave plus a company-wide break at year end.",
  },
];
