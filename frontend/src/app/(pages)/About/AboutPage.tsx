import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Handshake,
  MapPinned,
  ReceiptText,
  Zap,
} from "lucide-react";
import PageHero from "@/app/components/shared/PageHero";
import SectionHeading from "@/app/components/shared/SectionHeading";
import { VENUES } from "@/data/venues";
import { cn } from "@/utils";
import { CONTAINER } from "@/utils/layout";
import CtaBannerSection from "../Home/sections/CtaBannerSection";

const STATS = [
  { label: "Partner venues", value: String(VENUES.length) },
  {
    label: "Neighbourhoods",
    value: String(new Set(VENUES.map((venue) => venue.localityId)).size),
  },
  {
    label: "Seats to book",
    value: `${Math.round(VENUES.reduce((sum, venue) => sum + venue.seatsAvailable, 0) / 10) * 10}+`,
  },
  {
    label: "Average venue rating",
    value: (
      VENUES.reduce((sum, venue) => sum + venue.rating, 0) / VENUES.length
    ).toFixed(1),
  },
];

const JOURNEYS = [
  {
    title: "For members",
    text: "Freelancers, founders and teams who want a good place to work without signing a lease.",
    steps: [
      "Compare venues by area, price and amenities",
      "Pick the exact seat or room on a live floor plan",
      "Pay once and check in with a QR code",
      "Reserve a seat long term with a membership",
    ],
    cta: { label: "Explore workspaces", href: "/workspaces" },
  },
  {
    title: "For partners",
    text: "Coworking operators who want steady members and less time on admin.",
    steps: [
      "List your venue and map your floor plan",
      "Set prices and availability for every space",
      "Scan members in and mark seats taken from one dashboard",
      "Get paid for every booking and membership",
    ],
    cta: { label: "List your space", href: "/contact?topic=partner" },
  },
];

const VALUES = [
  {
    icon: ReceiptText,
    title: "Honest prices",
    text: "GST included, no booking fees, and refunds that follow a clear policy.",
  },
  {
    icon: BadgeCheck,
    title: "Venues we have visited",
    text: "Every partner is checked in person before it appears on Growth Hub.",
  },
  {
    icon: Zap,
    title: "Instant, not enquiry forms",
    text: "Real availability and instant confirmation, so you never wait on a call back.",
  },
  {
    icon: Handshake,
    title: "Fair to partners",
    text: "We grow when our venues fill up, so we send them members who stay.",
  },
  {
    icon: MapPinned,
    title: "Close to where you live",
    text: "More neighbourhoods every quarter, so the commute keeps getting shorter.",
  },
];

const GALLERY = [
  "/assets/home/extras/2.webp",
  "/assets/home/extras/3.webp",
  "/assets/home/extras/4.webp",
  "/assets/home/extras/5.webp",
];

const AboutPage = () => {
  return (
    <>
      <PageHero
        eyebrow="About Growth Hub"
        title="Great workspaces, without the hunting"
        description="Growth Hub brings Bangalore's best coworking venues into one place, so you can find, book and check in to a workspace in minutes."
      />

      <section className="bg-secondary py-16 lg:py-24">
        <div className={cn(CONTAINER, "grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16")}>
          <div className="relative aspect-4/3 overflow-hidden rounded-3xl">
            <Image
              src="/assets/home/extras/1.webp"
              alt="Members working at a Growth Hub partner venue"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Our story
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-tertiary sm:text-4xl">
              We do not own buildings. We connect you to the right one.
            </h2>
            <div className="mt-5 flex flex-col gap-4 text-sm leading-relaxed text-tertiary/70">
              <p>
                Finding a workspace used to mean calling around, visiting three
                places and waiting for a quote. Coworking operators, meanwhile,
                had empty desks on quiet days and no simple way to fill them.
              </p>
              <p>
                Growth Hub is a marketplace that fixes both sides. We partner
                with independent and established venues, put their real floor
                plans and prices online, and let you book a seat for an hour or
                reserve it for months.
              </p>
              <p>
                Partners keep running their spaces the way they like. We bring
                the members, handle payments and give them a dashboard to check
                everyone in.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-tertiary py-14 lg:py-16">
        <dl className={cn(CONTAINER, "grid grid-cols-2 gap-8 lg:grid-cols-4")}>
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <dd className="text-4xl font-bold text-secondary">{stat.value}</dd>
              <dt className="mt-1 text-sm text-secondary/65">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-surface py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            title="One platform, two sides"
            description="A marketplace only works when members and venues both win."
          />
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            {JOURNEYS.map((journey, index) => (
              <article
                key={journey.title}
                className={cn(
                  "flex flex-col rounded-2xl border p-6 sm:p-8",
                  index === 0
                    ? "feature-card border-primary/30"
                    : "border-tertiary/10 bg-secondary",
                )}
              >
                <h3 className="text-2xl font-bold text-tertiary">
                  {journey.title}
                </h3>
                <p className="mt-2 text-sm text-tertiary/65">{journey.text}</p>
                <ol className="mt-6 flex grow flex-col gap-3">
                  {journey.steps.map((step, stepIndex) => (
                    <li key={step} className="flex items-start gap-3 text-sm text-tertiary/80">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-secondary">
                        {stepIndex + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <Link
                  href={journey.cta.href}
                  className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-opacity hover:opacity-75"
                >
                  {journey.cta.label}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            title="What we care about"
            description="The promises behind every booking."
          />
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <li
                  key={value.title}
                  className="feature-card flex flex-col rounded-2xl p-5"
                >
                  <span className="bg-icon-tile inline-flex size-11 items-center justify-center rounded-xl">
                    <Icon aria-hidden="true" className="size-5 text-secondary" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-tertiary">
                    {value.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-tertiary/65">
                    {value.text}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="bg-surface py-16 lg:py-20">
        <div className={cn(CONTAINER, "grid grid-cols-2 gap-4 lg:grid-cols-4")}>
          {GALLERY.map((image, index) => (
            <div
              key={image}
              className={cn(
                "relative overflow-hidden rounded-2xl",
                index % 2 === 0 ? "aspect-3/4" : "aspect-square lg:mt-10",
              )}
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </section>

      <CtaBannerSection />
    </>
  );
};

export default AboutPage;
