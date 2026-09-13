import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CTA_BUTTON =
  "inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90";

const CtaBannerSection = () => {
  return (
    <section className="bg-secondary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="cta-banner mx-auto flex max-w-6xl flex-col items-center rounded-3xl px-6 py-16 text-center sm:px-14 lg:py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-secondary sm:text-4xl lg:text-[38px]">
            Ready to Find Your Perfect Workspace?
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary/85 text-pretty">
            Book premium coworking spaces, meeting rooms, and private offices in
            minutes. Join a thriving community and work your way, anytime,
            anywhere.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/book"
              className={`${CTA_BUTTON} bg-primary text-secondary`}
            >
              Book Your Workspace
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
            <Link
              href="/workspaces"
              className={`${CTA_BUTTON} bg-secondary text-tertiary`}
            >
              Explore Spaces
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBannerSection;
