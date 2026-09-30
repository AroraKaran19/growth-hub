import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  Crown,
  CreditCard,
  Mail,
  MessageSquare,
  Phone,
  QrCode,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import PageHero from "@/app/components/shared/PageHero";
import SectionHeading from "@/app/components/shared/SectionHeading";
import { FAQ_CATEGORIES, type FaqCategoryId } from "@/data/faqs";
import { CONTACT } from "@/data/footer";
import { cn } from "@/utils";
import { CONTAINER } from "@/utils/layout";
import SupportSearch from "./components/SupportSearch";

const TOPIC_ICONS: Record<FaqCategoryId, LucideIcon> = {
  bookings: CalendarCheck,
  payments: CreditCard,
  memberships: Crown,
  "check-in": QrCode,
  account: UserRound,
  partners: Building2,
};

const QUICK_ACTIONS = [
  { label: "Manage my bookings", href: "/account/bookings" },
  { label: "Cancel or reschedule", href: "/account/bookings" },
  { label: "Stop a membership", href: "/account/memberships" },
  { label: "Read the cancellation policy", href: "/cancellation-policy" },
];

const SupportPage = () => {
  const popular = FAQ_CATEGORIES.flatMap((category) =>
    category.faqs.slice(0, 1).map((faq) => ({ ...faq, categoryId: category.id })),
  ).slice(0, 5);

  return (
    <>
      <PageHero
        eyebrow="Help Center"
        title="How can we help?"
        description="Search our answers, or pick a topic below."
      >
        <SupportSearch />
      </PageHero>

      <section className="bg-surface py-16 lg:py-20">
        <div className={CONTAINER}>
          <SectionHeading title="Browse by topic" />
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FAQ_CATEGORIES.map((category) => {
              const Icon = TOPIC_ICONS[category.id];
              return (
                <li key={category.id}>
                  <Link
                    href={`/faqs#${category.id}`}
                    className="group flex h-full items-start gap-4 rounded-2xl border border-tertiary/10 bg-secondary p-5 transition-colors hover:border-primary/35"
                  >
                    <span className="bg-icon-tile flex size-11 shrink-0 items-center justify-center rounded-xl text-secondary">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-tertiary">
                        {category.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-tertiary/60">
                        {category.summary}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        {category.faqs.length} articles
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="bg-secondary py-16 lg:py-20">
        <div className={cn(CONTAINER, "grid grid-cols-1 gap-10 lg:grid-cols-2")}>
          <div>
            <h2 className="text-2xl font-semibold text-tertiary">
              Popular questions
            </h2>
            <ul className="mt-5 divide-y divide-tertiary/10 rounded-2xl border border-tertiary/10">
              {popular.map((faq) => (
                <li key={faq.question}>
                  <Link
                    href={`/faqs#${faq.categoryId}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/3"
                  >
                    {faq.question}
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-tertiary/40" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-tertiary">Quick actions</h2>
            <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {QUICK_ACTIONS.map((action) => (
                <li key={action.label}>
                  <Link
                    href={action.href}
                    className="flex h-full items-center justify-between gap-3 rounded-xl border border-tertiary/10 bg-surface px-4 py-3.5 text-sm font-medium text-tertiary transition-colors hover:border-primary/35"
                  >
                    {action.label}
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-tertiary py-16 lg:py-20">
        <div className={CONTAINER}>
          <SectionHeading
            tone="dark"
            title="Still need help?"
            description="Monday to Saturday, 9:00 AM to 7:00 PM. We reply to messages within one working day."
          />
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
            <Link
              href="/contact"
              className="feature-card flex flex-col rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
            >
              <MessageSquare aria-hidden="true" className="size-6 text-primary" />
              <span className="mt-4 text-base font-semibold text-tertiary">
                Send a message
              </span>
              <span className="mt-1 text-sm text-tertiary/65">
                Tell us what happened and we will sort it out.
              </span>
            </Link>
            <a
              href={`tel:${CONTACT.phones[0].replace(/\s/g, "")}`}
              className="feature-card flex flex-col rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
            >
              <Phone aria-hidden="true" className="size-6 text-primary" />
              <span className="mt-4 text-base font-semibold text-tertiary">
                Call {CONTACT.phones[0]}
              </span>
              <span className="mt-1 text-sm text-tertiary/65">
                Best for issues at a venue right now.
              </span>
            </a>
            <a
              href={`mailto:${CONTACT.email}`}
              className="feature-card flex flex-col rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
            >
              <Mail aria-hidden="true" className="size-6 text-primary" />
              <span className="mt-4 text-base font-semibold text-tertiary">
                Email {CONTACT.email}
              </span>
              <span className="mt-1 text-sm text-tertiary/65">
                Include your booking ID for a faster reply.
              </span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
};

export default SupportPage;
