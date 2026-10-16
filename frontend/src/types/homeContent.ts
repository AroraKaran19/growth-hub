export type SiteImage = { src: string; alt: string };

export type SiteLink = { label: string; href: string };

type Heading = { title: string; subtitle: string };

export type HomeContent = {
  hero: { pill: { show: boolean; text: string; href: string }; title: string; subtitle: string; image: SiteImage };
  discover: Heading;
  features: Heading & { cards: { icon: string; title: string; description: string }[] };
  categories: Heading;
  steps: Heading & { items: { title: string; description: string }[] };
  amenities: Heading & { image: SiteImage };
  community: Heading & { photos: SiteImage[] };
  testimonials: Heading;
  cta: { title: string; text: string; primary: SiteLink; secondary: SiteLink };
  /** The photo beside each sign-in form; a blank staff src keeps the dark panel. */
  signin: { member: SiteImage; partner: SiteImage; admin: SiteImage };
  seo: SeoSettings;
  /** Blank fields keep the page's built-in title and description. */
  seoPages: Record<SeoPage, { title: string; description: string }>;
};

export const SEO_PAGES = ["home", "workspaces", "locations", "memberships", "pricing", "about", "contact", "support", "faqs"] as const;

export type SeoPage = (typeof SEO_PAGES)[number];

export type SeoSettings = {
  siteName: string;
  /** The live https address; blank falls back to SITE_URL. */
  siteUrl: string;
  defaultTitle: string;
  description: string;
  keywords: string[];
  shareImage: SiteImage;
  favicon: SiteImage;
  appleIcon: SiteImage;
  twitterHandle: string;
  googleVerification: string;
  hideFromSearch: boolean;
};

export type HomeSectionKey = keyof HomeContent;

/** Sections an admin has edited; the rest use the built-in copy. */
export type HomeOverrides = Partial<HomeContent>;

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  photo: SiteImage | null;
  visible: boolean;
};
