"use client";

import { useState } from "react";
import {
  BLOG_CATEGORIES,
  BLOG_POSTS,
  type BlogCategory,
} from "@/data/blog";
import { cn } from "@/utils";
import PostCard from "./PostCard";

const BlogBrowser = () => {
  const [category, setCategory] = useState<BlogCategory | "All">("All");

  const posts =
    category === "All"
      ? BLOG_POSTS
      : BLOG_POSTS.filter((post) => post.category === category);
  const [featured, ...rest] = posts;

  return (
    <div>
      <div role="group" aria-label="Filter posts by category" className="flex flex-wrap gap-2">
        {(["All", ...BLOG_CATEGORIES] as const).map((item) => {
          const isActive = item === category;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={isActive}
              onClick={() => setCategory(item)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm transition-colors",
                isActive
                  ? "border-transparent bg-primary font-medium text-secondary"
                  : "border-tertiary/15 text-tertiary/75 hover:border-tertiary/35 hover:text-tertiary",
              )}
            >
              {item}
            </button>
          );
        })}
      </div>

      {featured && (
        <div className="mt-8">
          <PostCard post={featured} featured />
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogBrowser;
