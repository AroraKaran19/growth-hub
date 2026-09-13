export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Explore",
    links: [
      { label: "Locations", href: "/locations" },
      { label: "Workspaces", href: "/workspaces" },
      {
        label: "Meeting Rooms",
        href: "/workspaces?type=meeting-room",
      },
      { label: "Day Pass", href: "/workspaces" },
      {
        label: "Private Cabin",
        href: "/workspaces?type=private-cabin",
      },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Membership", href: "/memberships" },
      { label: "Pricing", href: "/pricing" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/support" },
      { label: "FAQs", href: "/faqs" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cancellation", href: "/cancellation-policy" },
    ],
  },
];

export const CONTACT = {
  address:
    "4th Floor, Orion Business Centre 27, 80 Feet Road, 6th Block Koramangala, Bengaluru, Karnataka 560095",
  phones: ["+91 9876765635", "+91 8765435445"],
  email: "hello@growthhub.in",
};

export const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/" },
  { label: "Facebook", href: "https://www.facebook.com/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/" },
] as const;
