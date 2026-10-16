import type { MetadataRoute } from "next";
import { loadSeo, siteUrlOf } from "@/libs/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { seo } = await loadSeo();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in areas and checkout steps have nothing for search results.
      disallow: ["/admin", "/partner", "/account", "/invoice", "/api", "/dev", "/login", "/workspaces/*/book"],
    },
    // Hidden sites stay crawlable so engines can read the noindex tag and drop listed pages.
    ...(!seo.hideFromSearch && { sitemap: `${siteUrlOf(seo)}/sitemap.xml` }),
  };
}
