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
