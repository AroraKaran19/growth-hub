export type NavLink = {
  label: string;
  href: string;
};

// Routes that render the signed-in member bar (white, member links, avatar)
// instead of the public one.
export const MEMBER_NAV_PREFIXES = ["/workspaces/", "/account"];

export const MEMBER_NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Locations", href: "/locations" },
  { label: "Contact Us", href: "/contact" },
  { label: "My Bookings", href: "/account/bookings" },
];

// Shared by the navbar and mobile drawer.
export const NAV_LINKS: NavLink[] = [
  { label: "Explore", href: "/workspaces" },
  { label: "Locations", href: "/locations" },
  { label: "Memberships", href: "/memberships" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
