"use client";

import { Suspense, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Crown, QrCode, TicketPercent } from "lucide-react";
import PhoneSignIn from "@/app/components/shared/PhoneSignIn";
import Logo from "@/app/components/ui/Logo";
import { useAuthStore } from "@/stores/auth";

const BENEFITS = [
  {
    icon: QrCode,
    title: "Check in with a QR",
    text: "Every booking comes with a code for reception.",
  },
  {
    icon: Crown,
    title: "Reserve your seat",
    text: "Memberships hold the same desk for you every day.",
  },
  {
    icon: TicketPercent,
    title: "Offers in one place",
    text: "Coupons are ready to apply at checkout.",
  },
];

/** Only same-site paths, so a crafted link can't bounce members elsewhere. */
const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const status = useAuthStore("member", (state) => state.status);
  const account = useAuthStore("member", (state) => state.account);

  // Arriving already signed in goes straight on, unless a name is still needed.
  useEffect(() => {
    if (status === "authenticated" && account && !account.needsOnboarding) {
      router.replace(next);
    }
  }, [status, account, next, router]);

  if (status === "loading") {
    return <div className="h-80 animate-pulse rounded-2xl bg-surface" />;
  }

  return <PhoneSignIn headingTag="h1" onComplete={() => router.replace(next)} />;
};

const LoginPage = () => {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      {/* What Growth Hub sells is space, so the panel shows a real one. */}
      <div className="relative hidden overflow-hidden bg-tertiary lg:block">
        <Image
          src="/assets/home/hero-bg.webp"
          alt=""
          fill
          sizes="(min-width: 1024px) 55vw, 0px"
          priority
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-tertiary via-tertiary/85 to-tertiary/25"
        />

        <Link
          href="/"
          aria-label="Growth Hub home"
          className="absolute left-12 top-12 z-10 w-fit"
        >
          <Logo className="h-11 w-auto text-secondary" />
        </Link>

        <div className="absolute inset-x-0 bottom-0 z-10 p-12 text-secondary">
          <h2 className="max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">
            Work better. Book smarter.
          </h2>
          <ul className="mt-10 flex max-w-md flex-col gap-5">
            {BENEFITS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex items-start gap-3.5">
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
      </div>

      <div className="flex items-center justify-center bg-surface px-4 py-12 sm:px-8">
        <div className="w-full max-w-md rounded-2xl border border-tertiary/10 bg-secondary p-7 sm:p-9">
          <Link href="/" aria-label="Growth Hub home" className="mb-7 block w-fit lg:hidden">
            <Logo className="h-10 w-auto text-tertiary" />
          </Link>
          {/* useSearchParams needs a Suspense boundary or the production
              build fails on this statically rendered route. */}
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
