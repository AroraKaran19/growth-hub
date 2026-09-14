"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CalendarRange,
  Eye,
  EyeOff,
  TicketPercent,
} from "lucide-react";
import Logo from "@/app/components/ui/Logo";
import { ADMIN_ACCOUNT } from "@/data/admin";
import { useAdminSession } from "@/stores/admin";
import { cn } from "@/utils";

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

const INPUT =
  "w-full rounded-lg border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const AdminLoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { session, isReady, signIn } = useAdminSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && session) router.replace(next);
  }, [isReady, session, next, router]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your admin email and password.");
      return;
    }
    if (
      email.trim().toLowerCase() !== ADMIN_ACCOUNT.email ||
      password !== ADMIN_ACCOUNT.password
    ) {
      setError("That email and password don't match an admin account.");
      return;
    }
    signIn({
      email: ADMIN_ACCOUNT.email,
      name: ADMIN_ACCOUNT.name,
      signedInAt: new Date().toISOString(),
    });
  };

  if (!isReady || session) {
    return <div className="h-96 animate-pulse rounded-2xl bg-surface" />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-tertiary">Admin sign in</h1>
      <p className="mt-1 text-sm text-tertiary/60">
        For the Growth Hub operations team.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-tertiary">
            Email
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="Your admin email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            aria-invalid={Boolean(error)}
            className={cn(INPUT, error ? "border-primary" : "border-tertiary/20")}
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-tertiary">
            Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "admin-login-error" : undefined}
              className={cn(INPUT, "pr-11", error ? "border-primary" : "border-tertiary/20")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-tertiary/50 transition-colors hover:text-tertiary"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p id="admin-login-error" role="alert" className="text-sm text-primary">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="cta-gradient mt-1 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
        >
          Sign in to admin
        </button>
      </form>

      <div className="mt-6 rounded-lg bg-tertiary/4 px-3 py-2.5 text-xs text-tertiary/60">
        <p className="font-medium text-tertiary/75">Demo account</p>
        <p className="mt-0.5">
          {ADMIN_ACCOUNT.email} / {ADMIN_ACCOUNT.password}
        </p>
      </div>

      <p className="mt-6 text-sm text-tertiary/60">
        Venue staff?{" "}
        <Link href="/partner/login" className="font-medium text-primary">
          Partner sign in
        </Link>
      </p>
    </div>
  );
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
