import { Armchair, CalendarClock, CircleStop, Presentation, QrCode, Repeat } from "lucide-react";
import FaqList from "@/app/components/shared/FaqList";
import PageHero from "@/app/components/shared/PageHero";
import SectionHeading from "@/app/components/shared/SectionHeading";
import { findFaqCategory } from "@/data/faqs";
import { getVenuesWithPlans } from "@/libs/api/venues";
import { cn } from "@/utils";
import { CONTAINER } from "@/utils/layout";
import CtaBannerSection from "../Home/sections/CtaBannerSection";
import PlanExplorer from "./components/PlanExplorer";

const INCLUDED = [
  {
    icon: Armchair,
    title: "A seat that is yours",
    text: "The same desk, cabin, office or meeting room on your plan's days, kept for you.",
  },
  {
    icon: CalendarClock,
    title: "No daily booking",
    text: "Your space is reserved on every covered day. Just turn up and work.",
  },
  {
    icon: Repeat,
    title: "Renews on its own",
    text: "Pay the first cycle today; after that it renews by card, UPI or bank mandate.",
  },
  {
    icon: CircleStop,
    title: "Stop any time",
    text: "Stop renewing from My Memberships and keep your seat until the end of what you paid for.",
  },
  {
    icon: Presentation,
    title: "Extras when you need them",
    text: "Add lockers, parking or printing for the days you want them, at the venue's prices.",
  },
  {
    icon: QrCode,
    title: "Member pass",
    text: "One QR code gets you and your team in at reception, every covered day.",
  },
];

const STEPS = [
  {
    title: "Pick a venue",
    text: "Browse partner venues and open the one you want to call your workspace.",
  },
  {
    title: "Choose a plan",
    text: "Pick one of its membership plans, how long each period runs, and how many seats.",
  },
  {
    title: "Reserve your space",
    text: "Choose your desks or room on the floor plan, name who sits where, and pay the first period.",
  },
  {
    title: "Check in daily",
    text: "Show your member pass at reception. Manage everything from My Memberships.",
  },
];

const COMPARISON = [
  {
    feature: "Your seat",
    pass: "Any open seat, picked each visit",
    membership: "The same seat or room, reserved on your days",
  },
  {
    feature: "Booking",
    pass: "Book and pay for every visit",
    membership: "Book once for the whole plan",
  },
  {
    feature: "Paying",
    pass: "Pay once for each visit",
    membership: "Renews automatically, stop any time",
  },
  {
    feature: "Extras",
    pass: "Add them when you book",
    membership: "Add them for the days you need",
  },
  {
    feature: "Best for",
    pass: "A few days a month",
    membership: "Working from the same place most days",
  },
];

const MembershipPlansPage = async () => {
  const faqs = findFaqCategory("memberships")?.faqs ?? [];
  const entries = (await getVenuesWithPlans()).map(({ venue, plans }) => ({
    venue: { slug: venue.slug, name: venue.name, locality: venue.locality, city: venue.city, image: venue.image },
    plans,
  }));

  return (
    <>
      <PageHero
        eyebrow="Memberships"
        title="Make one workspace yours"
        description="Reserve a desk, cabin, office or meeting room at a partner venue for a week or more. Your space is held on the plan's days, and it renews on its own until you stop it."
      />

      <section className="bg-secondary py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            title="Choose your plan"
            description="Pick a venue to see its plans, what each includes, and the days it covers."
          />
          <div className="mt-10">
            <PlanExplorer entries={entries} />
          </div>
        </div>
      </section>

      <section className="bg-tertiary py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            tone="dark"
            title="Every membership includes"
            description="Everything you need to make a partner venue your everyday office."
          />
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            {INCLUDED.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="feature-card flex flex-col rounded-2xl p-5"
                >
                  <span className="bg-icon-tile inline-flex size-12 items-center justify-center rounded-xl">
                    <Icon aria-hidden="true" className="size-5 text-secondary" />
                  </span>
                  <h3 className="mt-6 text-lg font-semibold text-tertiary">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-[1.6] text-tertiary/65">
                    {item.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-surface py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            title="How it works"
            description="From browsing to your first day in four steps."
          />
          <div className="relative mt-12 lg:mt-16">
            <div
              aria-hidden="true"
              className="absolute left-[12.5%] right-[12.5%] top-8 hidden border-t border-dashed border-tertiary/25 lg:block"
            />
            <ol className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="flex flex-col items-center text-center"
                >
                  <span className="relative z-10 flex size-16 items-center justify-center rounded-full bg-primary text-lg font-medium text-secondary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-xl font-medium text-tertiary">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-60 text-sm leading-relaxed text-tertiary/60">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-secondary py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            title="Pass or membership?"
            description="Passes suit the odd day. A membership pays off once you are in most days."
          />
          <div className="mx-auto mt-10 max-w-4xl overflow-x-auto rounded-2xl border border-tertiary/10">
            <table className="w-full min-w-xl text-left text-sm">
              <thead className="bg-surface">
                <tr>
                  <th scope="col" className="px-5 py-4 font-semibold text-tertiary">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold text-tertiary">
                    Day pass
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold text-primary">
                    Membership
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, index) => (
                  <tr
                    key={row.feature}
                    className={cn(index > 0 && "border-t border-tertiary/8")}
                  >
                    <th
                      scope="row"
                      className="px-5 py-4 font-medium text-tertiary"
                    >
                      {row.feature}
                    </th>
                    <td className="px-5 py-4 text-tertiary/65">{row.pass}</td>
                    <td className="px-5 py-4 text-tertiary">{row.membership}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-surface py-16 lg:py-24">
        <div className={cn(CONTAINER, "max-w-4xl 2xl:max-w-4xl")}>
          <SectionHeading title="Membership questions" />
          <div className="mt-10">
            <FaqList faqs={faqs} />
          </div>
        </div>
      </section>

      <CtaBannerSection />
    </>
  );
};

export default MembershipPlansPage;
