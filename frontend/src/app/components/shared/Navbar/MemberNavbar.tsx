"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Menu } from "lucide-react";
import Logo from "@/app/components/ui/Logo";
import { MEMBER_NAV_LINKS } from "@/data/navigation";
import UserMenu from "./components/UserMenu";
import MobileMenuDrawer, {
  MOBILE_MENU_DRAWER_ID,
} from "./components/MobileMenuDrawer";

const MemberNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-tertiary/8 bg-secondary">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6 lg:h-24 lg:px-10 2xl:max-w-[1600px]">
        <Link href="/" aria-label="Growth Hub home" draggable={false}>
          <Logo className="h-11 w-auto text-tertiary lg:h-14" />
        </Link>

        {/* Links group with the right-hand cluster rather than spreading, so
            the space falls after the logo. */}
        <div className="flex items-center gap-6 lg:gap-10">
          <ul className="hidden items-center gap-5 lg:flex">
            {MEMBER_NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-tertiary/85 transition-colors hover:text-tertiary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-tertiary/5 py-2 pl-2 pr-3 text-sm sm:pr-4 font-medium text-tertiary transition-colors hover:bg-tertiary/8"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-primary">
                <MapPin
                  aria-hidden="true"
                  className="size-3.5 fill-secondary text-primary"
                />
              </span>
              Bangalore
            </button>

            <div className="hidden sm:block">
              <UserMenu variant="light" />
            </div>

            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={isMenuOpen}
              aria-controls={MOBILE_MENU_DRAWER_ID}
              className="rounded-md p-1.5 text-tertiary transition-colors hover:bg-tertiary/5 lg:hidden"
            >
              <Menu className="size-7" />
            </button>
          </div>
        </div>
      </nav>

      <MobileMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        links={MEMBER_NAV_LINKS}
      />
    </header>
  );
};

export default MemberNavbar;
