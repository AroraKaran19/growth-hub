import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Hub",
  description: "Growth Hub is a platform for businesses to grow their business.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
