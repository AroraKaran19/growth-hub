"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import FaqList from "@/app/components/shared/FaqList";
import { FAQ_CATEGORIES, type FaqCategoryId } from "@/data/faqs";
import { cn } from "@/utils";

const FaqBrowser = () => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategoryId | "all">("all");

  const sections = useMemo(() => {
    const search = query.trim().toLowerCase();

    return FAQ_CATEGORIES.filter(
      (item) => category === "all" || item.id === category,
    )
      .map((item) => ({
        ...item,
        faqs: search
          ? item.faqs.filter((faq) =>
              `${faq.question} ${faq.answer}`.toLowerCase().includes(search),
            )
          : item.faqs,
      }))
      .filter((item) => item.faqs.length > 0);
  }, [query, category]);

  const chips: { id: FaqCategoryId | "all"; title: string }[] = [
    { id: "all", title: "All topics" },
    ...FAQ_CATEGORIES.map(({ id, title }) => ({ id, title })),
  ];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-32 lg:h-fit">
        <label className="relative block">
          <span className="sr-only">Search questions</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary/45"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search questions"
            className="w-full rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </label>

        <nav aria-label="Question topics" className="mt-4">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {chips.map((chip) => {
              const isActive = category === chip.id;
              return (
                <li key={chip.id}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setCategory(chip.id)}
                    className={cn(
                      "w-full rounded-lg px-3.5 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "cta-gradient font-medium text-secondary"
                        : "border border-tertiary/12 text-tertiary/75 hover:text-tertiary lg:border-transparent lg:hover:bg-tertiary/5",
                    )}
                  >
                    {chip.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col gap-10">
        {sections.length > 0 ? (
          sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-32">
              <h2 className="text-xl font-bold text-tertiary">{section.title}</h2>
              <p className="mt-1 text-sm text-tertiary/60">{section.summary}</p>
              <div className="mt-4">
                <FaqList faqs={section.faqs} />
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-2xl border border-tertiary/10 px-6 py-14 text-center">
            <p className="text-base font-semibold text-tertiary">
              No questions match &ldquo;{query}&rdquo;
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
              Try a different word, or ask us directly and we will reply within
              a working day.
            </p>
            <Link
              href="/contact"
              className="cta-gradient mt-5 inline-flex rounded-lg px-5 py-2.5 text-sm font-medium text-secondary"
            >
              Contact support
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaqBrowser;
