"use client";

import Link from "next/link";
import { ArrowRight, LifeBuoy, LogIn } from "lucide-react";
import { useSession } from "@/stores/session";
import { cn } from "@/utils";
import { CONTAINER } from "@/utils/layout";
import SupportRequestForm from "./SupportRequestForm";

const NEXT_STEPS = [
  { title: "Tell us what happened", detail: "Pick a topic and link the booking or membership if there is one." },
  { title: "We reply within a working day", detail: "By email, and on the request page in your account." },
  { title: "Follow it to the end", detail: "Add details any time until it's closed. Replying to a resolved request reopens it." },
];

const SignInPrompt = () => (
  <div className="relative overflow-hidden rounded-3xl bg-tertiary p-6 text-secondary shadow-2xl shadow-tertiary/25 sm:p-8">
    <div aria-hidden="true" className="cta-banner absolute -right-16 -top-24 size-64 rounded-full opacity-40 blur-3xl" />
    <div className="relative">
      <span className="grid size-12 place-items-center rounded-2xl bg-secondary/10 ring-1 ring-secondary/15">
        <LogIn aria-hidden="true" className="size-5" />
      </span>
      <h3 className="mt-5 text-xl font-bold">Sign in to raise a request</h3>
      <p className="mt-2 max-w-sm text-sm text-secondary/70">
        Requests are tied to your account, so you can attach screenshots, link a booking and follow every reply in one place.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          href="/login?next=/support"
          className="cta-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-secondary shadow-lg shadow-primary/30 transition-opacity hover:opacity-90"
        >
          Sign in
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link href="/contact" className="text-sm font-medium text-secondary/75 underline-offset-4 transition-colors hover:text-secondary hover:underline">
          No account? Send us a message
        </Link>
      </div>
    </div>
  </div>
);

const RaiseRequestSection = () => {
  const { session, isReady } = useSession();

  return (
    <section id="raise" aria-labelledby="raise-title" className="scroll-mt-24 bg-surface py-16 lg:py-20">
      <div className={cn(CONTAINER, "grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14")}>
        <div className="lg:pt-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <LifeBuoy aria-hidden="true" className="size-3.5" />
            Support request
          </span>
          <h2 id="raise-title" className="mt-4 text-3xl font-bold text-tertiary">
            Raise a request
          </h2>
          <p className="mt-3 max-w-md text-base text-tertiary/65">
            Something wrong with a booking, a payment or check-in? Send it here and the Growth Hub team picks it up.
          </p>

          <ol className="relative mt-8 flex flex-col gap-6 pl-12">
            <span aria-hidden="true" className="absolute bottom-3 left-4 top-3 w-px bg-linear-to-b from-primary/50 via-tertiary/15 to-transparent" />
            {NEXT_STEPS.map((step, index) => (
              <li
                key={step.title}
                style={{ animationDelay: `${index * 80}ms` }}
                className="relative animate-[fade-up_0.4s_ease-out_both] motion-reduce:animate-none"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-12 top-0 grid size-8 place-items-center rounded-full text-sm font-bold shadow-sm",
                    index === 0 ? "cta-gradient text-secondary" : "bg-secondary text-tertiary ring-1 ring-tertiary/10",
                  )}
                >
                  {index + 1}
                </span>
                <p className="font-semibold text-tertiary">{step.title}</p>
                <p className="mt-0.5 text-sm text-tertiary/60">{step.detail}</p>
              </li>
            ))}
          </ol>

          {session && (
            <Link
              href="/account/support"
              className="group mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80"
            >
              See your requests
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
          )}
        </div>

        <div>
          {!isReady ? (
            <div aria-busy="true" aria-label="Checking your sign-in" className="h-96 animate-pulse rounded-3xl bg-secondary" />
          ) : session ? (
            <SupportRequestForm />
          ) : (
            <SignInPrompt />
          )}
        </div>
      </div>
    </section>
  );
};

export default RaiseRequestSection;
