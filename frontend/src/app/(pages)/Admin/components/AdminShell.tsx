"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Armchair,
  Building2,
  CalendarCheck,
  ExternalLink,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  TicketPercent,
} from "lucide-react";
import Logo from "@/app/components/ui/Logo";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { useAdminSession } from "@/stores/admin";
import { cn } from "@/utils";

const ADMIN_LINKS = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Venues", href: "/admin/venues", icon: Building2 },
  { label: "Pricing", href: "/admin/pricing", icon: IndianRupee },
  { label: "Availability", href: "/admin/availability", icon: Armchair },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck },
  { label: "Coupons", href: "/admin/coupons", icon: TicketPercent },
];

/** Signed-in frame for every admin page: sidebar, top bar and guard. */
const AdminShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isReady, signOut } = useAdminSession();

  useAuthBootstrap("admin");

  useEffect(() => {
    if (isReady && !session) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, session, pathname, router]);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  if (!isReady || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-sm text-tertiary/60" aria-live="polite">
          Checking your admin sign-in...
        </p>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden bg-tertiary text-secondary lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:p-5">
        <div className="flex items-center gap-2.5">
          <Logo className="h-10 w-auto text-secondary" />
          <span className="badge-gradient rounded-full px-2 py-0.5 text-[11px] font-semibold">
            Admin
          </span>
        </div>

        <nav aria-label="Admin" className="mt-8">
          <ul className="flex flex-col gap-1">
            {ADMIN_LINKS.map((link) => {
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
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto border-t border-secondary/10 pt-4">
          <p className="text-sm font-medium">{session.name}</p>
          <p className="truncate text-xs text-secondary/55">{session.email}</p>
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
                Admin
              </span>
            </div>
            <p className="hidden text-sm text-tertiary/60 lg:block">
              Growth Hub operations
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                target="_blank"
                className="hidden items-center gap-1.5 text-sm text-tertiary/65 transition-colors hover:text-tertiary sm:inline-flex"
              >
                View site
                <ExternalLink aria-hidden="true" className="size-3.5" />
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
            aria-label="Admin sections"
            className="flex gap-1 overflow-x-auto border-t border-tertiary/8 px-4 py-2 sm:px-6 lg:hidden"
          >
            {ADMIN_LINKS.map((link) => {
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
                </Link>
              );
            })}
          </nav>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  );
};

export default AdminShell;
