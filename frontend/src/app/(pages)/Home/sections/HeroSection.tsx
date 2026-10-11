import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import type { HomeContent } from "@/types/homeContent";
import type { SelectOption } from "@/types/search";
import HeroSearchBar from "../components/HeroSearchBar";

const PILL =
  "inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-tertiary shadow-lg shadow-tertiary/10";

const HeroSection = ({ content, locations }: { content: HomeContent["hero"]; locations: SelectOption[] }) => {
  const { pill } = content;
  const pillBody = (
    <>
      <Gift aria-hidden="true" className="size-4 shrink-0 text-primary" />
      {pill.text}
      {pill.href && <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-tertiary/60" />}
    </>
  );

  return (
    <section className="relative flex min-h-screen items-center justify-center">
      <Image src={content.image.src} alt={content.image.alt} fill priority sizes="100vw" className="object-cover" />

      <div className="absolute inset-0 bg-linear-to-b from-tertiary/70 via-tertiary/45 to-tertiary/40" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-10 lg:pt-32 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          {pill.show &&
            (pill.href ? (
              <Link href={pill.href} className={`${PILL} transition-transform hover:-translate-y-0.5`}>
                {pillBody}
              </Link>
            ) : (
              <p className={PILL}>{pillBody}</p>
            ))}

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-secondary text-balance sm:text-5xl lg:text-6xl">
            {content.title}
          </h1>

          <p className="mx-auto mt-5 max-w-4xl text-base text-secondary/85 text-pretty">{content.subtitle}</p>
        </div>

        <HeroSearchBar locations={locations} className="mt-10 lg:mt-14" />
      </div>
    </section>
  );
};

export default HeroSection;
