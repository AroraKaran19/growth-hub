"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { FAQ_CATEGORIES } from "@/data/faqs";

const MAX_RESULTS = 6;

/** Searches every FAQ from the Help Center hero. */
const SupportSearch = () => {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (search.length < 2) return [];
    return FAQ_CATEGORIES.flatMap((category) =>
      category.faqs
        .filter((faq) =>
          `${faq.question} ${faq.answer}`.toLowerCase().includes(search),
        )
        .map((faq) => ({ ...faq, categoryId: category.id, categoryTitle: category.title })),
    );
  }, [search]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <label className="relative block">
        <span className="sr-only">Search the Help Center</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tertiary/45"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for refunds, pausing, invoices..."
          className="w-full rounded-xl border border-transparent bg-secondary py-4 pl-12 pr-4 text-base text-tertiary outline-none transition-shadow placeholder:text-tertiary/45 focus-visible:ring-4 focus-visible:ring-primary/30"
        />
      </label>

      {search.length >= 2 && (
        <div
          aria-live="polite"
          className="mt-3 overflow-hidden rounded-xl bg-secondary text-left"
        >
          {results.length > 0 ? (
            <ul className="divide-y divide-tertiary/8">
              {results.slice(0, MAX_RESULTS).map((result) => (
                <li key={result.question}>
                  <Link
                    href={`/faqs#${result.categoryId}`}
                    className="block px-5 py-3.5 transition-colors hover:bg-tertiary/3"
                  >
                    <span className="text-xs font-medium text-primary">
                      {result.categoryTitle}
                    </span>
                    <span className="block text-sm font-medium text-tertiary">
                      {result.question}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-sm text-tertiary/60">
                      {result.answer}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-tertiary/65">
              Nothing matches that yet.{" "}
              <Link
                href="/contact"
                className="inline-flex items-center gap-1 font-medium text-primary"
              >
                Ask our team
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportSearch;
