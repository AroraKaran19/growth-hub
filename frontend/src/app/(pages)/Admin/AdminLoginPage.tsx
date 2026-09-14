"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, CalendarRange, TicketPercent } from "lucide-react";
import EmailCodeSignIn from "@/app/components/shared/EmailCodeSignIn";
import Logo from "@/app/components/ui/Logo";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";

const HIGHLIGHTS = [
  {
    icon: Building2,
    title: "Listings and pricing",
    text: "Publish venues and set hourly and day pass rates.",
  },
  {
    icon: CalendarRange,
    title: "Availability",
    text: "Take seats and rooms out of service across the platform.",
  },
  {
    icon: TicketPercent,
    title: "Offers",
    text: "Create coupon codes members can redeem at checkout.",
  },
];

const safeNext = (value: string | null) =>
  value && value.startsWith("/admin") && !value.startsWith("/admin/login")
    ? value
    : "/admin";

const AdminLoginForm = () => {
  const searchParams = useSearchParams();
  useAuthBootstrap("admin");

  return <EmailCodeSignIn surface="admin" next={safeNext(searchParams.get("next"))} />;
};

const AdminLoginPage = () => {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-tertiary p-12 text-secondary lg:flex">
        <div
          aria-hidden="true"
          className="cta-banner absolute -bottom-40 -left-40 size-128 rounded-full opacity-40 blur-3xl"
        />
        <Link href="/" aria-label="Growth Hub home" className="relative w-fit">
          <Logo className="h-12 w-auto text-secondary" />
        </Link>

        <div className="relative">
          <p className="badge-gradient w-fit rounded-full px-3 py-1 text-xs font-semibold">
            Admin panel
          </p>
          <h2 className="mt-5 max-w-md text-4xl font-semibold tracking-tight">
            Keep every listing accurate and bookable.
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
          Growth Hub internal tools. Access is logged.
        </p>
      </div>

      <div className="flex items-center justify-center bg-surface px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-tertiary/10 bg-secondary p-6 sm:p-8">
          <Link href="/" aria-label="Growth Hub home" className="mb-6 block w-fit lg:hidden">
            <Logo className="h-10 w-auto text-tertiary" />
          </Link>
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
            <AdminLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
