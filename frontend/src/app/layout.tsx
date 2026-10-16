import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { loadSeo, sharedOpenGraph, siteUrlOf } from "@/libs/seo";
import "./globals.css";
import LayoutWrapper from "./wrapper/LayoutWrapper";

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"] });

// Admins edit these under Site settings; blank icons keep the built-in favicon.
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await loadSeo();
  const shared = sharedOpenGraph(seo);
  return {
    metadataBase: new URL(siteUrlOf(seo)),
    applicationName: seo.siteName,
    title: { default: seo.defaultTitle, template: `%s | ${seo.siteName}` },
    description: seo.description,
    ...(seo.keywords.length > 0 && { keywords: seo.keywords }),
    openGraph: shared,
    twitter: {
      card: shared.images ? "summary_large_image" : "summary",
      ...(seo.twitterHandle && { site: seo.twitterHandle }),
      ...(shared.images && { images: shared.images.map((image) => image.url) }),
    },
    icons: { icon: seo.favicon.src || "/favicon.ico", ...(seo.appleIcon.src && { apple: seo.appleIcon.src }) },
    ...(seo.googleVerification && { verification: { google: seo.googleVerification } }),
    ...(seo.hideFromSearch && { robots: { index: false, follow: false } }),
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${plusJakartaSans.className}`}
    >
      <body className="min-h-full flex flex-col">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
