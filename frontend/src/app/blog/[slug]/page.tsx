import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticlePage from "../../(pages)/Blog/ArticlePage";
import { BLOG_POSTS, findPost } from "@/data/blog";

type ArticleRouteProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: ArticleRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) return { title: "Post not found" };
  return { title: post.title, description: post.excerpt };
}

export default async function ArticleRoute({ params }: ArticleRouteProps) {
  const { slug } = await params;
  const post = findPost(slug);

  if (!post) notFound();

  return <ArticlePage post={post} />;
}
