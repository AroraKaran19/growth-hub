"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CircleUserRound, Menu } from "lucide-react";
import Logo from "@/app/components/ui/Logo";
import { NAV_LINKS } from "@/data/navigation";
import { useSession } from "@/stores/session";
import { cn } from "@/utils";
import MobileMenuDrawer, {
  MOBILE_MENU_DRAWER_ID,
} from "./components/MobileMenuDrawer";

const ACTION_BUTTON =
  "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors";

const Navbar = () => {
  const pathname = usePathname();
  const { session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Only the homepage has a dark hero behind the bar; everywhere else the
  // white links would sit on white content, so stay solid from the top.
  const isSolid = isScrolled || pathname !== "/";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-secondary/10">
      <div
        className={cn(
          "absolute inset-0 bg-tertiary transition-opacity duration-300",
          isSolid ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-b from-tertiary/80 via-tertiary/40 to-transparent transition-opacity duration-300",
          isSolid ? "opacity-0" : "opacity-100",
        )}
      />

      {/* 1fr auto 1fr: equal outer columns keep the links truly centred,
          which justify-between cannot do with a wider action group. */}
      <nav className="relative mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:grid lg:h-24 lg:grid-cols-[1fr_auto_1fr] lg:px-10 2xl:max-w-[1600px]">
        <Link
          href="/"
          aria-label="Growth Hub home"
          draggable={false}
          className="lg:justify-self-start"
        >
          <Logo className="h-11 w-auto text-secondary lg:h-14" />
        </Link>

        <ul className="hidden items-center gap-8 lg:flex lg:justify-self-center">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className="text-sm font-medium text-secondary/90 transition-colors hover:text-secondary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex lg:justify-self-end">
          <Link
            href={session ? "/account" : "/login"}
            className={cn(
              ACTION_BUTTON,
              "border border-secondary/40 text-secondary hover:bg-secondary/10",
            )}
          >
            <CircleUserRound className="size-4" />
            {session ? "My Account" : "Login"}
          </Link>
          <Link
            href="/workspaces"
            className={cn(
              ACTION_BUTTON,
              "bg-primary text-secondary hover:bg-accent",
            )}
          >
            Book Now
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          aria-controls={MOBILE_MENU_DRAWER_ID}
          className="rounded-md p-1.5 text-secondary transition-colors hover:bg-secondary/10 lg:hidden"
        >
          <Menu className="size-7" />
        </button>
      </nav>

      <MobileMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </header>
  );
};

export default Navbar;
