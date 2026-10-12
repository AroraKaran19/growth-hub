"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Armchair,
  CalendarCheck,
  Crown,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquareText,
  IndianRupee,
  Puzzle,
  ReceiptText,
  ScanLine,
  CircleUserRound,
} from "lucide-react";
import Logo from "@/app/components/ui/Logo";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { usePartnerRequests } from "@/hooks/useCancellationRequests";
import { usePartnerVenue } from "@/hooks/useVenues";
import { PartnerVenueContext, usePartnerSession } from "@/stores/partner";
import { cn } from "@/utils";
import { PartnerSkeleton } from "./PartnerUi";

export const PARTNER_LINKS = [
  { label: "Overview", href: "/partner", icon: LayoutDashboard },
  { label: "Check-in", href: "/partner/check-in", icon: ScanLine },
  { label: "Bookings", href: "/partner/bookings", icon: CalendarCheck },
  { label: "Seats", href: "/partner/seats", icon: Armchair },
  { label: "Members", href: "/partner/members", icon: Crown },
  { label: "Requests", href: "/partner/requests", icon: MessageSquareText },
  { label: "Prices", href: "/partner/prices", icon: IndianRupee },
  { label: "Add-ons", href: "/partner/addons", icon: Puzzle },
  { label: "Statements", href: "/partner/statements", icon: ReceiptText },
];

/** Signed-in frame for every partner page: sidebar, top bar and guard. */
const PartnerShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isReady, signOut } = usePartnerSession();
  const { venue, error: venueError } = usePartnerVenue();
  const { requests: waiting } = usePartnerRequests("open");
  const badgeFor = (href: string) =>
    href === "/partner/requests" && waiting.length > 0 ? (
      <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-secondary">{waiting.length}</span>
    ) : null;

  useAuthBootstrap("partner");

  useEffect(() => {
    if (isReady && !session) {
      router.replace(`/partner/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, session, pathname, router]);

  const isActive = (href: string) =>
    href === "/partner" ? pathname === href : pathname.startsWith(href);

  if (!isReady || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-sm text-tertiary/60" aria-live="polite">
          Checking your partner sign-in...
        </p>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace("/partner/login");
  };

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden bg-tertiary text-secondary lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:p-5">
        <div className="flex items-center gap-2.5">
          <Logo className="h-10 w-auto text-secondary" />
          <span className="badge-gradient rounded-full px-2 py-0.5 text-[11px] font-semibold">
            Partner
          </span>
        </div>

        {venue && (
          <div className="mt-6 rounded-xl bg-secondary/8 p-3.5">
            <p className="text-sm font-semibold">{venue.name}</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-secondary/65">
              <MapPin aria-hidden="true" className="size-3.5" />
              {venue.locality}, {venue.city}
            </p>
          </div>
        )}

        <nav aria-label="Partner" className="mt-6">
          <ul className="flex flex-col gap-1">
            {PARTNER_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors",
                      active
                        ? "cta-gradient font-medium text-secondary"
                        : "text-secondary/70 hover:bg-secondary/8 hover:text-secondary",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {link.label}
                    {badgeFor(link.href)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto border-t border-secondary/10 pt-4">
          <Link href="/partner/profile" className="group block rounded-lg transition-opacity hover:opacity-85">
            <p className="text-sm font-medium group-hover:underline">{session.staffName}</p>
            <p className="truncate text-xs text-secondary/55">{session.email}</p>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-tertiary/10 bg-secondary">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2.5 lg:hidden">
              <Logo className="h-9 w-auto text-tertiary" />
              <span className="badge-gradient rounded-full px-2 py-0.5 text-[11px] font-semibold text-secondary">
                Partner
              </span>
            </div>
            <p className="hidden text-sm text-tertiary/60 lg:block">
              {venue ? `${venue.name} front desk` : "Front desk"}
            </p>
            <div className="flex items-center gap-4">
              {venue && (
                <Link
                  href={`/workspaces/${venue.slug}`}
                  target="_blank"
                  className="hidden items-center gap-1.5 text-sm text-tertiary/65 transition-colors hover:text-tertiary sm:inline-flex"
                >
                  View listing
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </Link>
              )}
              <Link
                href="/partner/profile"
                aria-label="Your profile"
                className="rounded-full p-1.5 text-tertiary/65 transition-colors hover:bg-tertiary/5 hover:text-tertiary lg:hidden"
              >
                <CircleUserRound aria-hidden="true" className="size-5" />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary lg:hidden"
              >
                <LogOut aria-hidden="true" className="size-4" />
                Sign out
              </button>
            </div>
          </div>

          <nav
            aria-label="Partner sections"
            className="flex gap-1 overflow-x-auto border-t border-tertiary/8 px-4 py-2 sm:px-6 lg:hidden"
          >
            {PARTNER_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm",
                    active
                      ? "cta-gradient font-medium text-secondary"
                      : "text-tertiary/70 hover:bg-tertiary/5",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {link.label}
                  {badgeFor(link.href)}
                </Link>
              );
            })}
          </nav>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {venue ? (
            <PartnerVenueContext value={venue}>{children}</PartnerVenueContext>
          ) : venueError ? (
            <div
              role="alert"
              className="rounded-2xl border border-primary/25 bg-secondary px-6 py-14 text-center shadow-sm"
            >
              <p className="text-base font-semibold text-tertiary">
                We couldn&apos;t load your venue
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
                Refresh, or contact Growth Hub if it continues.
              </p>
            </div>
          ) : (
            <PartnerSkeleton />
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerShell;
