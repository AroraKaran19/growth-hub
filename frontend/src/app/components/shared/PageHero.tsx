import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/utils";
import { CONTAINER } from "@/utils/layout";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  image?: string;
  align?: "center" | "left";
  children?: ReactNode;
};

/** The dark photo band that opens content pages, under the solid navbar. */
const PageHero = ({
  eyebrow,
  title,
  description,
  image = "/assets/home/hero-bg.webp",
  align = "center",
  children,
}: PageHeroProps) => {
  const isCentered = align === "center";

  return (
    <section className="relative overflow-hidden bg-tertiary">
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-linear-to-b from-tertiary/85 via-tertiary/60 to-tertiary/90" />

      <div className={cn(CONTAINER, "relative pb-14 pt-32 lg:pb-20 lg:pt-40")}>
        <div
          className={cn(
            "flex max-w-3xl flex-col",
            isCentered ? "mx-auto items-center text-center" : "items-start",
          )}
        >
          {eyebrow && (
            <p className="badge-gradient rounded-full px-3.5 py-1.5 text-xs font-semibold text-secondary">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-secondary text-balance sm:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-2xl text-base text-secondary/80 text-pretty">
              {description}
            </p>
          )}
        </div>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
};

export default PageHero;
