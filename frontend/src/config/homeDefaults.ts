import { SEO_PAGES, type HomeContent, type HomeOverrides } from "@/types/homeContent";

const FEATURE_COPY =
  "Book your preferred workspace in just a few clicks with real-time availability and instant confirmation.";

/** The landing page's built-in copy, shown for any section an admin hasn't edited. */
export const HOME_DEFAULTS: HomeContent = {
  hero: {
    pill: { show: true, text: "New Opening in Bangalore • Win 1 Month Free Membership", href: "" },
    title: "Work Better. Book Smarter.",
    subtitle:
      "Book premium coworking spaces, meeting rooms and private offices across Bangalore. Book instantly and check in with a QR code.",
    image: { src: "/assets/home/hero-bg.webp", alt: "" },
  },
  discover: {
    title: "Discover Your Next Workspace",
    subtitle:
      "Choose from modern workspaces across India's leading business districts, equipped with everything you need to stay productive.",
  },
  features: {
    title: "A Smarter Way to Work, Meet & Grow",
    subtitle:
      "Experience a seamless workspace booking platform designed for modern professionals, startups, and growing teams, with premium spaces, flexible plans, and instant access.",
    cards: [
      { icon: "Ticket", title: "Instant Workspace Booking", description: FEATURE_COPY },
      { icon: "Globe", title: "Flexible Workspaces", description: FEATURE_COPY },
      { icon: "Handshake", title: "Premium Locations", description: FEATURE_COPY },
      { icon: "QrCode", title: "Contactless QR Check-in", description: FEATURE_COPY },
      { icon: "Globe", title: "Enterprise-Grade Amenities", description: FEATURE_COPY },
      { icon: "Handshake", title: "Built for Teams & Professionals", description: FEATURE_COPY },
    ],
  },
  categories: {
    title: "Workspace Categories",
    subtitle:
      "Experience a smarter way to book coworking spaces with a seamless, real-time booking journey designed for modern professionals.",
  },
  steps: {
    title: "How does it work?",
    subtitle:
      "Experience a smarter way to book coworking spaces with a seamless, real-time booking journey designed for modern professionals.",
    items: [
      { title: "Explore", description: "Find the ideal workspace based on your location, schedule, and work style." },
      { title: "Book", description: "Select your seat or meeting room and confirm your reservation in seconds." },
      { title: "Pay Securely", description: "Complete your payment online and receive your booking confirmation instantly." },
      { title: "QR Check-in", description: "Scan your QR code at Reception and check in instantly." },
    ],
  },
  amenities: {
    title: "Everything You Need to Stay Productive",
    subtitle:
      "Work smarter with thoughtfully curated amenities designed to keep you comfortable, connected, and focused throughout your workday.",
    image: { src: "/assets/home/productive-section-bg.webp", alt: "" },
  },
  community: {
    title: "More Than Just a Workspace",
    subtitle:
      "Join a vibrant community of entrepreneurs, creators, and professionals through exclusive events, learning sessions, and networking opportunities.",
    photos: [
      { src: "/assets/home/extras/1.webp", alt: "Members sharing food around a table" },
      { src: "/assets/home/extras/2.webp", alt: "Lounge seating beside glass meeting rooms" },
      { src: "/assets/home/extras/3.webp", alt: "Members celebrating a festival together" },
      { src: "/assets/home/extras/4.webp", alt: "Three members talking over coffee" },
      { src: "/assets/home/extras/5.webp", alt: "A team working together at a shared desk" },
      { src: "/assets/home/extras/6.webp", alt: "Seating set out for an event" },
    ],
  },
  testimonials: {
    title: "Loved by Modern Professionals",
    subtitle:
      "From freelancers to enterprise teams, our members trust Growth Hub for premium workspaces and exceptional experiences.",
  },
  cta: {
    title: "Ready to Find Your Perfect Workspace?",
    text: "Book premium coworking spaces, meeting rooms, and private offices in minutes. Join a thriving community and work your way, anytime, anywhere.",
    primary: { label: "Book Your Workspace", href: "/workspaces" },
    secondary: { label: "Explore Spaces", href: "/locations" },
  },
  signin: {
    member: { src: "/assets/home/hero-bg.webp", alt: "Members working in a Growth Hub workspace" },
    partner: { src: "", alt: "" },
    admin: { src: "", alt: "" },
  },
  seo: {
    siteName: "Growth Hub",
    siteUrl: "",
    defaultTitle: "Growth Hub | Coworking spaces in Bangalore",
    description:
      "Book coworking desks, private cabins, offices and meeting rooms across Bangalore. Pay online and check in with a QR code.",
    keywords: [],
    shareImage: { src: "", alt: "" },
    favicon: { src: "", alt: "" },
    appleIcon: { src: "", alt: "" },
    twitterHandle: "",
    googleVerification: "",
    hideFromSearch: false,
  },
  seoPages: Object.fromEntries(SEO_PAGES.map((page) => [page, { title: "", description: "" }])) as HomeContent["seoPages"],
};

export const withDefaults = (overrides: HomeOverrides): HomeContent => ({ ...HOME_DEFAULTS, ...overrides });
