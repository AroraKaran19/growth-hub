"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Armchair, ScanLine, Users } from "lucide-react";
import EmailCodeSignIn from "@/app/components/shared/EmailCodeSignIn";
import Logo from "@/app/components/ui/Logo";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";

const HIGHLIGHTS = [
  {
    icon: ScanLine,
    title: "Check members in",
    text: "Scan a booking QR or member pass in seconds.",
  },
  {
    icon: Armchair,
    title: "See every seat",
    text: "Know what is booked, occupied or free right now.",
  },
  {
    icon: Users,
    title: "Know your members",
    text: "Memberships, reserved seats and pauses in one list.",
  },
];

const safeNext = (value: string | null) =>
  value && value.startsWith("/partner") && !value.startsWith("/partner/login")
    ? value
    : "/partner";

const PartnerLoginForm = () => {
  const searchParams = useSearchParams();
  useAuthBootstrap("partner");

  return (
    <>
      <EmailCodeSignIn surface="partner" next={safeNext(searchParams.get("next"))} />
      <p className="mt-6 text-sm text-tertiary/60">
        Booking a workspace?{" "}
        <Link href="/login" className="font-medium text-primary">
          Member login
        </Link>
      </p>
    </>
  );
};

const PartnerLoginPage = () => {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-tertiary p-12 text-secondary lg:flex">
        <div
          aria-hidden="true"
          className="cta-banner absolute -right-40 -top-40 size-128 rounded-full opacity-40 blur-3xl"
        />
        <Link href="/" aria-label="Growth Hub home" className="relative w-fit">
          <Logo className="h-12 w-auto text-secondary" />
        </Link>

        <div className="relative">
          <p className="badge-gradient w-fit rounded-full px-3 py-1 text-xs font-semibold">
            Partner dashboard
          </p>
          <h2 className="mt-5 max-w-md text-4xl font-semibold tracking-tight">
            Run your front desk from one screen.
          </h2>
          <ul className="mt-8 flex flex-col gap-5">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="text-sm text-secondary/70">{item.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-xs text-secondary/50">
          Growth Hub partner tools. For authorised venue staff only.
        </p>
      </div>

      <div className="flex items-center justify-center bg-surface px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-tertiary/10 bg-secondary p-6 sm:p-8">
          <Link href="/" aria-label="Growth Hub home" className="mb-6 block w-fit lg:hidden">
            <Logo className="h-10 w-auto text-tertiary" />
          </Link>
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
            <PartnerLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default PartnerLoginPage;
