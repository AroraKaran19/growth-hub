import Image from "next/image";
import type { HomeContent } from "@/types/homeContent";
import { cn } from "@/utils";

// The mosaic's shape is fixed: tile 1 is wide and tile 3 is tall.
const SPANS = ["lg:col-span-2", "", "lg:row-span-2", "", "", ""];

const CommunitySection = ({ content }: { content: HomeContent["community"] }) => {
  return (
    <section className="bg-secondary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-tertiary sm:text-4xl lg:text-[40px]">{content.title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-tertiary/70 text-pretty">{content.subtitle}</p>
        </div>

        {/* Container aspect drives the two equal rows, so the tall tile spans
            both without a hard-coded height. */}
        <div className="mt-10 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:mt-14 lg:aspect-1052/369 lg:grid-cols-[1fr_1fr_1fr_1.2fr] lg:grid-rows-2">
          {content.photos.map((photo, index) => (
            <div
              key={`${photo.src}-${index}`}
              className={cn("relative aspect-4/3 w-full overflow-hidden rounded-xl lg:aspect-auto lg:h-full", SPANS[index])}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;
