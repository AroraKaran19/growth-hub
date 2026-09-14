import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/data/blog";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";

type PostCardProps = {
  post: BlogPost;
  featured?: boolean;
};

const PostCard = ({ post, featured = false }: PostCardProps) => {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-tertiary/10 bg-secondary",
        featured && "lg:flex-row",
      )}
    >
      <Link
        href={`/blog/${post.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          "relative block aspect-video overflow-hidden",
          featured && "lg:aspect-auto lg:w-3/5",
        )}
      >
        <Image
          src={post.image}
          alt=""
          fill
          sizes={featured ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      <div className={cn("flex grow flex-col p-5 sm:p-6", featured && "lg:justify-center lg:p-10")}>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tertiary/55">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
            {post.category}
          </span>
          <span>{formatDay(post.publishedOn)}</span>
          <span>{post.readMinutes} min read</span>
        </p>
        <h3
          className={cn(
            "mt-3 font-semibold text-tertiary text-balance",
            featured ? "text-2xl sm:text-3xl" : "text-lg",
          )}
        >
          <Link
            href={`/blog/${post.slug}`}
            className="transition-colors hover:text-primary"
          >
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-tertiary/65">
          {post.excerpt}
        </p>
      </div>
    </article>
  );
};

export default PostCard;
