import type { Metadata } from "next";
import BlogPage from "../(pages)/Blog/BlogPage";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides, productivity tips and neighbourhood notes from the Growth Hub team.",
};

export default function Blog() {
  return <BlogPage />;
}
