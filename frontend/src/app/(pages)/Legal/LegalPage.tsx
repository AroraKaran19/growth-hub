import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PageHero from "@/app/components/shared/PageHero";
import {
  LEGAL_DOCUMENTS,
  type LegalDocumentId,
} from "@/data/legal";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import { CONTAINER } from "@/utils/layout";

const LegalPage = ({ id }: { id: LegalDocumentId }) => {
  const document = LEGAL_DOCUMENTS[id];
  const related = Object.values(LEGAL_DOCUMENTS).filter(
    (item) => item.id !== id,
  );

  return (
    <>
      <PageHero
        eyebrow={`Last updated ${formatDay(document.updated)}`}
        title={document.title}
        description={document.summary}
      />

      <section className="bg-secondary py-14 lg:py-20">
        <div
          className={cn(
            CONTAINER,
            "grid grid-cols-1 gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14",
          )}
        >
          <nav
            aria-label="On this page"
            className="lg:sticky lg:top-32 lg:h-fit"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-tertiary/50">
              On this page
            </p>
            <ol className="mt-3 flex flex-col gap-1 border-l border-tertiary/10">
              {document.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-tertiary/65 transition-colors hover:border-primary hover:text-tertiary"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="max-w-3xl">
            {document.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className={cn(
                  "scroll-mt-32",
                  index > 0 && "mt-10 border-t border-tertiary/8 pt-10",
                )}
              >
                <h2 className="text-xl font-bold text-tertiary">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-3 text-sm leading-relaxed text-tertiary/75 sm:text-base sm:leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-3 text-sm leading-relaxed text-tertiary/75 sm:text-base"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                        />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <div className="mt-14 rounded-2xl border border-tertiary/10 bg-surface p-5 sm:p-6">
              <p className="text-sm font-semibold text-tertiary">
                Related policies
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {related.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/${item.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-75"
                    >
                      {item.title}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-tertiary/55">
                Questions about this policy?{" "}
                <Link href="/contact" className="font-medium text-tertiary underline">
                  Contact us
                </Link>
                .
              </p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
};

export default LegalPage;
