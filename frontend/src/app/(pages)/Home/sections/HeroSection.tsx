import Image from "next/image";
import { Gift } from "lucide-react";
import HeroSearchBar from "../components/HeroSearchBar";

const HeroSection = () => {
  return (
    <section className="relative flex min-h-screen items-center justify-center">
      <Image
        src="/assets/home/hero-bg.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      <div className="absolute inset-0 bg-linear-to-b from-tertiary/70 via-tertiary/45 to-tertiary/40" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-10 lg:pt-32 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-tertiary shadow-lg shadow-tertiary/10">
            <Gift
              aria-hidden="true"
              className="size-4 shrink-0 text-primary"
            />
            New Opening in Bangalore • Win 1 Month Free Membership
          </p>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-secondary text-balance sm:text-5xl lg:text-6xl">
            Work Better. Book Smarter.
          </h1>

          <p className="mx-auto mt-5 max-w-4xl text-base text-secondary/85 text-pretty">
            Book premium coworking spaces, meeting rooms and private offices
            across Bangalore. Book instantly and check in with a QR code.
          </p>
        </div>

        <HeroSearchBar className="mt-10 lg:mt-14" />
      </div>
    </section>
  );
};

export default HeroSection;
