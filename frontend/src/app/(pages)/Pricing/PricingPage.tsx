import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import FaqList from "@/app/components/shared/FaqList";
import PageHero from "@/app/components/shared/PageHero";
import SectionHeading from "@/app/components/shared/SectionHeading";
import { HALF_DAY_HOURS } from "@/data/bookingOptions";
import { findFaqCategory } from "@/data/faqs";
import { getPublishedVenues, getVenuesWithPlans } from "@/libs/api/venues";
import { PASS_TYPES } from "@/types/booking";
import { cn } from "@/utils";
import { CONTAINER } from "@/utils/layout";
import { PLAN_LENGTHS, PLAN_LENGTH_LABELS, PLAN_LENGTH_UNITS } from "@/utils/plans";
import { passPriceRange } from "@/utils/venues";
import CtaBannerSection from "../Home/sections/CtaBannerSection";

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

const PASS_DETAILS: Record<(typeof PASS_TYPES)[number], { title: string; text: string; unit: string }> = {
  hourly: {
    title: "Hourly",
    text: "Short calls, interviews and focused sprints. Book from 1 to 8 hours.",
    unit: "hr",
  },
  "half-day": {
    title: "Half day",
    text: `A ${HALF_DAY_HOURS} hour block, morning or afternoon, from the start time you choose.`,
    unit: "half day",
  },
  "full-day": {
    title: "Full day",
    text: "The whole day during venue hours. No start time to pick.",
    unit: "day",
  },
};

const PROMISES = [
  "The price you see is the price you pay",
  "Free rescheduling on every booking",
  "Ask the venue to cancel from your booking",
  "Coupons applied before you pay",
  "Tax invoice for every booking",
  "No sign-up or listing fee for members",
];

const PricingPage = async () => {
  const faqs = findFaqCategory("payments")?.faqs ?? [];
  const [venues, withPlans] = await Promise.all([getPublishedVenues(), getVenuesWithPlans()]);
  const deskPlans = withPlans.flatMap((entry) => entry.plans).filter((plan) => plan.space === "desk");
  // The lowest price any venue set for each length, never derived.
  const deskFrom = (length: (typeof PLAN_LENGTHS)[number]) => {
    const prices = deskPlans.map((plan) => plan.prices[length]).filter((price): price is number => price !== null);
    return prices.length ? Math.min(...prices) : null;
  };

  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Clear prices, nothing added at checkout"
        description="Pay per visit with a pass, or reserve your seat with a membership. Each venue sets its own rates; here is what to expect across Bangalore."
      />

      <section className="bg-secondary py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            title="Passes"
            description="For open desks, cabins, offices and meeting rooms. Desks are priced per person, rooms per room."
          />
          <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
            {PASS_TYPES.map((type) => {
              const details = PASS_DETAILS[type];
              const range = passPriceRange(venues, type);
              return (
                <article
                  key={type}
                  className="flex flex-col rounded-2xl border border-tertiary/12 bg-secondary p-6"
                >
                  <h3 className="text-xl font-bold text-tertiary">
                    {details.title}
                  </h3>
                  <p className="mt-1 text-sm text-tertiary/60">{details.text}</p>
                  {range ? (
                    <>
                      <p className="mt-6 flex flex-wrap items-baseline gap-x-1.5 text-sm text-tertiary/65">
                        From
                        <span className="text-3xl font-bold text-tertiary">
                          {rupees(range.min)}
                        </span>
                        / {details.unit}
                      </p>
                      <p className="mt-1 text-xs text-tertiary/55">
                        {range.max > range.min
                          ? `Up to ${rupees(range.max)} at premium venues`
                          : "The same rate at every venue"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-6 text-lg font-semibold text-tertiary/70">
                      Prices coming soon
                    </p>
                  )}
                  <Link
                    href="/workspaces"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-75"
                  >
                    Browse workspaces
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-surface py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            title="Memberships"
            description="Desk plans per seat, from the most affordable partner venue. Each venue offers its own plans, including cabins, offices and meeting rooms."
          />
          <div className="mx-auto mt-10 max-w-5xl overflow-x-auto rounded-2xl border border-tertiary/10 bg-secondary">
            <table className="w-full min-w-2xl text-left text-sm">
              <thead className="bg-tertiary/3">
                <tr>
                  <th scope="col" className="px-5 py-4 font-semibold text-tertiary">
                    Plan
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold text-tertiary">
                    Desk plans from
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold text-tertiary">
                    Renews
                  </th>
                </tr>
              </thead>
              <tbody>
                {PLAN_LENGTHS.map((length, index) => {
                  const details = { plan: PLAN_LENGTH_LABELS[length], unit: PLAN_LENGTH_UNITS[length] };
                  const price = deskFrom(length);
                  return (
                    <tr
                      key={length}
                      className={cn(index > 0 && "border-t border-tertiary/8")}
                    >
                      <th scope="row" className="px-5 py-4 font-medium text-tertiary">
                        {details.plan}
                      </th>
                      <td className="px-5 py-4 text-tertiary">
                        {price ? (
                          <>
                            {rupees(price)}
                            <span className="text-tertiary/55"> / {details.unit}</span>
                          </>
                        ) : (
                          <span className="text-tertiary/55">Prices coming soon</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-tertiary/75">
                        Every {details.unit}, until you stop it
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/memberships"
              className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
            >
              Compare membership plans
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-tertiary py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            tone="dark"
            title="No surprises at checkout"
            description="What you see on the workspace page is what you pay."
          />
          <ul className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROMISES.map((promise) => (
              <li
                key={promise}
                className="flex items-center gap-3 rounded-2xl border border-secondary/10 bg-secondary/5 px-5 py-4 text-sm text-secondary/90"
              >
                <BadgeCheck aria-hidden="true" className="size-5 shrink-0 text-primary" />
                {promise}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-secondary py-16 lg:py-24">
        <div className={cn(CONTAINER, "max-w-4xl 2xl:max-w-4xl")}>
          <SectionHeading title="Payment questions" />
          <div className="mt-10">
            <FaqList faqs={faqs} />
          </div>
        </div>
      </section>

      <CtaBannerSection />
    </>
  );
};

export default PricingPage;
