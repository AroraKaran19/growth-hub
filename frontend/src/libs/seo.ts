import type { Metadata } from "next";
import { withDefaults } from "@/config/homeDefaults";
import { SEO_PAGE_COPY } from "@/config/seoPages";
import { getHomeOverrides } from "@/libs/api/site";
import type { SeoPage, SeoSettings } from "@/types/homeContent";

const LOCAL_URL = "http://localhost:3000";

export const loadSeo = async () => {
  const content = withDefaults(await getHomeOverrides());
  return { seo: content.seo, pages: content.seoPages };
};

export const siteUrlOf = (seo: SeoSettings) => seo.siteUrl || process.env.SITE_URL || LOCAL_URL;

/** Open Graph fields every page shares; child pages replace openGraph whole, so they spread this in. */
export const sharedOpenGraph = (seo: SeoSettings) => ({
  type: "website" as const,
  siteName: seo.siteName,
  locale: "en_IN",
  ...(seo.shareImage.src && {
    images: [{ url: seo.shareImage.src, alt: seo.shareImage.alt || seo.siteName, width: 1200, height: 630 }],
  }),
});

/** A public page's metadata: the admin's override when set, else the page's built-in copy. */
export const pageMetadata = async (page: SeoPage): Promise<Metadata> => {
  const copy = SEO_PAGE_COPY[page];
  const { seo, pages } = await loadSeo();
  const override = pages[page];
  const description = override.description.trim() || copy.description || seo.description;
  const custom = override.title.trim();
  // The home page has no title of its own, so it uses the site title unless an admin set one.
  const title = page === "home" ? (custom ? { absolute: custom } : undefined) : custom || copy.title;
  const shownTitle = typeof title === "object" ? title.absolute : (title ?? seo.defaultTitle);
  return {
    ...(title !== undefined && { title }),
    description,
    alternates: { canonical: copy.path },
    openGraph: { ...sharedOpenGraph(seo), title: shownTitle, description, url: copy.path },
  };
};
