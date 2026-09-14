import {
  Armchair,
  CalendarClock,
  CirclePause,
  Presentation,
  QrCode,
  UserPlus,
} from "lucide-react";
import FaqList from "@/app/components/shared/FaqList";
import PageHero from "@/app/components/shared/PageHero";
import SectionHeading from "@/app/components/shared/SectionHeading";
import { findFaqCategory } from "@/data/faqs";
import { MAX_PAUSE_DAYS } from "@/data/membershipPlans";
import { cn } from "@/utils";
import { CONTAINER } from "@/utils/layout";
import CtaBannerSection from "../Home/sections/CtaBannerSection";
import PlanExplorer from "./components/PlanExplorer";

const INCLUDED = [
  {
    icon: Armchair,
    title: "A seat that is yours",
    text: "The same desk, cabin or office every day, kept exactly as you left it.",
  },
  {
    icon: CalendarClock,
    title: "No daily booking",
    text: "Your space is reserved for the whole plan. Just turn up and work.",
  },
  {
    icon: Presentation,
    title: "Meeting room hours",
    text: "Included every cycle and used automatically when you book a room.",
  },
  {
    icon: UserPlus,
    title: "Guest passes",
    text: "Bring a colleague or client for the day without paying extra.",
  },
  {
    icon: CirclePause,
    title: "Pause when you travel",
    text: `Pause for up to ${MAX_PAUSE_DAYS} days and the days are added back to your plan.`,
  },
  {
    icon: QrCode,
    title: "Member pass",
    text: "One QR code gets you in at reception, every day of your plan.",
  },
];

const STEPS = [
  {
    title: "Pick a venue",
    text: "Browse partner venues and open the one you want to call your workspace.",
  },
  {
    title: "Choose a plan",
    text: "On its booking page, pick 1 week, 1 month, 3 months or 6 months under Membership.",
  },
  {
    title: "Reserve your seat",
    text: "Choose your desk, cabin or office on the floor plan and pay once.",
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
    membership: "The same seat, reserved for you",
  },
  {
    feature: "Booking",
    pass: "Book and pay for every visit",
    membership: "Book once for the whole plan",
  },
  {
    feature: "Meeting rooms",
    pass: "Paid by the hour",
    membership: "Hours included every cycle",
  },
  {
    feature: "Guests",
    pass: "Book a pass for each guest",
    membership: "Guest passes included",
  },
  {
    feature: "Time away",
    pass: "Nothing to pause",
    membership: `Pause up to ${MAX_PAUSE_DAYS} days at a time`,
  },
  {
    feature: "Best for",
    pass: "A few days a month",
    membership: "Working from the same place most days",
  },
];

const MembershipPlansPage = () => {
  const faqs = findFaqCategory("memberships")?.faqs ?? [];

  return (
    <>
      <PageHero
        eyebrow="Memberships"
        title="Make one workspace yours"
        description="Reserve a desk, cabin or office at a partner venue for a week or more. Your seat is held every day, with meeting room hours and guest passes included."
      />

      <section className="bg-secondary py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            title="Choose your plan"
            description="Pick a plan length to see prices and what each membership includes."
          />
          <div className="mt-10">
            <PlanExplorer />
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
