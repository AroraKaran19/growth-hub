import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { withDefaults } from "@/config/homeDefaults";
import { getHomeOverrides } from "@/libs/api/site";
import type { HomeContent } from "@/types/homeContent";

const CTA_BUTTON =
  "inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90";

// Other pages reuse the banner, so it loads the saved copy when not handed it.
const CtaBannerSection = async ({ content: given }: { content?: HomeContent["cta"] }) => {
  const content = given ?? withDefaults(await getHomeOverrides()).cta;
  return (
    <section className="bg-secondary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="cta-banner mx-auto flex max-w-6xl flex-col items-center rounded-3xl px-6 py-16 text-center sm:px-14 lg:py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-secondary sm:text-4xl lg:text-[38px]">{content.title}</h2>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary/85 text-pretty">{content.text}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link href={content.primary.href} className={`${CTA_BUTTON} bg-primary text-secondary`}>
              {content.primary.label}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
            <Link href={content.secondary.href} className={`${CTA_BUTTON} bg-secondary text-tertiary`}>
              {content.secondary.label}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBannerSection;
