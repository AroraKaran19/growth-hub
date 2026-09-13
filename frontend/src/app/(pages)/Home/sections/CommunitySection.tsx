import Image from "next/image";
import { cn } from "@/utils";

const GALLERY = [
  {
    src: "/assets/home/extras/1.webp",
    alt: "Members sharing food around a table",
    span: "lg:col-span-2",
  },
  {
    src: "/assets/home/extras/2.webp",
    alt: "Lounge seating beside glass meeting rooms",
  },
  {
    src: "/assets/home/extras/3.webp",
    alt: "Members celebrating a festival together",
    span: "lg:row-span-2",
  },
  {
    src: "/assets/home/extras/4.webp",
    alt: "Three members talking over coffee",
  },
  {
    src: "/assets/home/extras/5.webp",
    alt: "A team working together at a shared desk",
  },
  { src: "/assets/home/extras/6.webp", alt: "Seating set out for an event" },
];

const CommunitySection = () => {
  return (
    <section className="bg-secondary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-tertiary sm:text-4xl lg:text-[40px]">
            More Than Just a Workspace
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-tertiary/70 text-pretty">
            Join a vibrant community of entrepreneurs, creators, and
            professionals through exclusive events, learning sessions, and
            networking opportunities.
          </p>
        </div>

        {/* Container aspect drives the two equal rows, so the tall tile spans
            both without a hard-coded height. */}
        <div className="mt-10 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:mt-14 lg:aspect-1052/369 lg:grid-cols-[1fr_1fr_1fr_1.2fr] lg:grid-rows-2">
          {GALLERY.map((tile) => (
            <div
              key={tile.src}
              className={cn(
                "relative aspect-4/3 w-full overflow-hidden rounded-xl lg:aspect-auto lg:h-full",
                tile.span,
              )}
            >
              <Image
                src={tile.src}
                alt={tile.alt}
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
