"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CircleUserRound, LogOut, X } from "lucide-react";
import Logo from "@/app/components/ui/Logo";
import { NAV_LINKS, type NavLink } from "@/data/navigation";
import { useSiteAccount } from "@/hooks/useSiteAccount";
import { cn } from "@/utils";

export const MOBILE_MENU_DRAWER_ID = "mobile-menu-drawer";

type MobileMenuDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  links?: NavLink[];
};

const MobileMenuDrawer = ({
  isOpen,
  onClose,
  links = NAV_LINKS,
}: MobileMenuDrawerProps) => {
  const pathname = usePathname();
  const { account } = useSiteAccount();

  // Lock the page behind the drawer without shifting it.
  useEffect(() => {
    if (!isOpen) return;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-tertiary/50 transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id={MOBILE_MENU_DRAWER_ID}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        // inert keeps the off-screen panel unreachable but still animatable.
        inert={!isOpen}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-xs flex-col bg-secondary shadow-xl transition-transform duration-300 ease-out lg:hidden",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-tertiary/10 px-5 py-4">
          <Logo className="h-11 w-auto text-tertiary" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1.5 text-tertiary transition-colors hover:bg-tertiary/5"
          >
            <X className="size-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-5 py-6">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-tertiary transition-colors hover:bg-tertiary/5 hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-3 border-t border-tertiary/10 px-5 py-5">
          {account ? (
            <div className="overflow-hidden rounded-xl border border-tertiary/10">
              <div className="flex items-center gap-3 bg-tertiary px-4 py-3 text-secondary">
                <CircleUserRound aria-hidden="true" className="size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{account.name}</p>
                  <p className="truncate text-xs text-secondary/60">{account.badge}</p>
                </div>
              </div>
              <ul className="p-1.5">
                {account.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
                      >
                        <Icon aria-hidden="true" className="size-4 text-tertiary/55" />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      void account.signOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/6"
                  >
                    <LogOut aria-hidden="true" className="size-4" />
                    Log out
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-tertiary/20 px-5 py-3 text-sm font-semibold text-tertiary transition-colors hover:bg-tertiary/5"
            >
              <CircleUserRound className="size-4" />
              Login
            </Link>
          )}
          {(!account || account.kind === "member") && (
            <Link
              href="/workspaces"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-accent"
            >
              Book Now
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};

export default MobileMenuDrawer;
