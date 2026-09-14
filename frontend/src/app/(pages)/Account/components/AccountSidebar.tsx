"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  Crown,
  Gift,
  LogOut,
  UserRound,
} from "lucide-react";
import { useSession } from "@/stores/session";
import { cn } from "@/utils";

const ACCOUNT_LINKS = [
  { label: "My Profile", href: "/account", icon: UserRound },
  { label: "My Bookings", href: "/account/bookings", icon: CalendarCheck },
  { label: "Coupons", href: "/account/coupons", icon: Gift },
  { label: "Memberships", href: "/account/memberships", icon: Crown },
];

const AccountSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useSession();

  // Booking details has its own "All bookings" link, so a second back is noise.
  const showBack = !pathname.startsWith("/account/bookings/");

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <aside className="flex h-fit flex-col rounded-2xl border border-tertiary/10 bg-surface p-5 lg:min-h-112">
      {showBack && (
        <button
          type="button"
          onClick={() => router.back()}
          className="cta-gradient mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back
        </button>
      )}

      <h2 className="text-xl font-bold text-tertiary">My Account</h2>

      <nav className="mt-5">
        <ul className="flex flex-col gap-1.5">
          {ACCOUNT_LINKS.map((link) => {
            const Icon = link.icon;
            // "/account" is every page's prefix, so only an exact match counts.
            const isActive =
              pathname === link.href ||
              (link.href !== "/account" && pathname.startsWith(`${link.href}/`));

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm transition-colors",
                    isActive
                      ? "cta-gradient font-medium text-secondary"
                      : "text-tertiary/70 hover:bg-tertiary/5 hover:text-tertiary",
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

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-auto inline-flex w-fit items-center gap-2 pt-8 text-sm font-medium text-primary transition-opacity hover:opacity-75"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Sign Out
      </button>
    </aside>
  );
};

export default AccountSidebar;
