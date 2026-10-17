import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, LifeBuoy, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

const SHORTCUTS = [
  { href: "/workspaces", label: "Workspaces", hint: "Desks, cabins and meeting rooms", icon: Building2 },
  { href: "/locations", label: "Locations", hint: "Venues across Bangalore", icon: MapPin },
  { href: "/memberships", label: "Memberships", hint: "A seat kept for you", icon: BadgeCheck },
  { href: "/support", label: "Help Center", hint: "Answers and support requests", icon: LifeBuoy },
];

export default function NotFound() {
  return (
    <section className="bg-surface px-4 pb-20 pt-32 sm:px-6 lg:pt-36">
      <div className="mx-auto grid w-full max-w-5xl items-stretch gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-3xl bg-tertiary p-8 text-secondary shadow-2xl shadow-tertiary/25 sm:p-10">
          <div aria-hidden="true" className="cta-gradient absolute -right-24 -top-24 size-72 rounded-full opacity-40 blur-3xl" />
          <div aria-hidden="true" className="cta-gradient absolute -bottom-32 -left-20 size-64 rounded-full opacity-20 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-medium text-secondary/60">Error 404</p>
            <p aria-hidden="true" className="mt-2 bg-linear-to-br from-secondary to-secondary/40 bg-clip-text text-8xl font-extrabold leading-none text-transparent sm:text-9xl">
              404
            </p>
            <h1 className="mt-6 text-2xl font-bold sm:text-3xl">This page isn&apos;t here</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-secondary/70 sm:text-base">
              The link may be old, or the page may have moved. Your bookings and memberships are safe in your account.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/"
                className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-secondary shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                Back to home
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/account" className="text-sm font-medium text-secondary/70 transition-colors hover:text-secondary">
                Go to my account
              </Link>
            </div>
          </div>
        </div>

        <nav aria-label="Popular pages" className="rounded-3xl bg-secondary p-6 shadow-lg shadow-tertiary/5 sm:p-8">
          <h2 className="text-base font-semibold text-tertiary">Where would you like to go?</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {SHORTCUTS.map(({ href, label, hint, icon: Icon }, index) => (
              <li
                key={href}
                style={{ animationDelay: `${index * 70}ms` }}
                className="animate-[fade-up_0.4s_ease-out_both] motion-reduce:animate-none"
              >
                <Link
                  href={href}
                  className="group flex items-center gap-4 rounded-2xl border border-tertiary/8 bg-surface px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 grow">
                    <span className="block text-sm font-semibold text-tertiary">{label}</span>
                    <span className="block truncate text-xs text-tertiary/55">{hint}</span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-tertiary/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
