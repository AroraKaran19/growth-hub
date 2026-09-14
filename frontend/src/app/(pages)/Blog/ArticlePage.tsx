import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BLOG_POSTS, type BlogPost } from "@/data/blog";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import { CONTAINER } from "@/utils/layout";
import PostCard from "./components/PostCard";

const ArticlePage = ({ post }: { post: BlogPost }) => {
  const related = [
    ...BLOG_POSTS.filter(
      (item) => item.slug !== post.slug && item.category === post.category,
    ),
    ...BLOG_POSTS.filter(
      (item) => item.slug !== post.slug && item.category !== post.category,
    ),
  ].slice(0, 3);

  return (
    <>
      <article className="bg-secondary pb-16 pt-28 lg:pb-24 lg:pt-36">
        <div className={cn(CONTAINER, "max-w-3xl 2xl:max-w-3xl")}>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-tertiary/60 transition-colors hover:text-tertiary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            All posts
          </Link>

          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tertiary/55">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {post.category}
            </span>
            <span>{formatDay(post.publishedOn)}</span>
            <span>{post.readMinutes} min read</span>
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-tertiary text-balance sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-tertiary/65 text-pretty">
            {post.excerpt}
          </p>
          <p className="mt-4 text-sm text-tertiary/55">By {post.author}</p>
        </div>

        <div className={cn(CONTAINER, "mt-10 max-w-5xl 2xl:max-w-5xl")}>
          <div className="relative aspect-video overflow-hidden rounded-3xl">
            <Image
              src={post.image}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 64rem, 100vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className={cn(CONTAINER, "mt-10 max-w-3xl 2xl:max-w-3xl")}>
          {post.body.map((section, index) => (
            <section key={section.heading ?? index} className={cn(index > 0 && "mt-8")}>
              {section.heading && (
                <h2 className="text-2xl font-semibold text-tertiary">
                  {section.heading}
                </h2>
              )}
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-4 text-base leading-relaxed text-tertiary/75"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <div className="feature-card mt-12 flex flex-col gap-4 rounded-2xl border border-primary/25 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-semibold text-tertiary">
                Ready to try a new workspace?
              </p>
              <p className="mt-1 text-sm text-tertiary/65">
                Book a pass in minutes and check in with a QR code.
              </p>
            </div>
            <Link
              href="/workspaces"
              className="cta-gradient inline-flex shrink-0 items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
            >
              Explore workspaces
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="bg-surface py-14 lg:py-20">
          <div className={CONTAINER}>
            <h2 className="text-2xl font-semibold text-tertiary">Keep reading</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {related.map((item) => (
                <PostCard key={item.slug} post={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default ArticlePage;
