import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PageHero from "@/app/components/shared/PageHero";
import { cn } from "@/utils";
import { CONTAINER } from "@/utils/layout";
import FaqBrowser from "./components/FaqBrowser";

const FaqsPage = () => {
  return (
    <>
      <PageHero
        eyebrow="FAQs"
        title="Frequently asked questions"
        description="Answers about booking, payments, memberships and checking in, all in one place."
      />

      <section className="bg-surface py-16 lg:py-20">
        <div className={CONTAINER}>
          <FaqBrowser />
        </div>
      </section>

      <section className="bg-secondary py-14">
        <div
          className={cn(
            CONTAINER,
            "flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left",
          )}
        >
          <div>
            <h2 className="text-xl font-semibold text-tertiary">
              Still have a question?
            </h2>
            <p className="mt-1 text-sm text-tertiary/60">
              Our team replies within one working day.
            </p>
          </div>
          <Link
            href="/contact"
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            Contact us
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
};

export default FaqsPage;
