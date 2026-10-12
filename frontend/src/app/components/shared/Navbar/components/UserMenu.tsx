"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, CircleUserRound, LogOut } from "lucide-react";
import { useSiteAccount } from "@/hooks/useSiteAccount";
import { cn } from "@/utils";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

type UserMenuProps = { variant: "dark" | "light" };

const UserMenu = ({ variant }: UserMenuProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, account } = useSiteAccount();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const isDark = variant === "dark";

  useEffect(() => {
    if (!isOpen) return;
    rootRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [isOpen]);

  if (!account) {
    if (!isReady) {
      return <span aria-hidden="true" className={cn("h-10 w-28 animate-pulse rounded-lg", isDark ? "bg-secondary/10" : "bg-tertiary/8")} />;
    }
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors",
          isDark ? "border border-secondary/40 text-secondary hover:bg-secondary/10" : "bg-tertiary text-secondary hover:bg-tertiary/90",
        )}
      >
        <CircleUserRound className="size-4" />
        Login
      </Link>
    );
  }

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(rootRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape" || event.key === "Tab") {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      items[(at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };

  const signOut = async () => {
    setIsOpen(false);
    await account.signOut();
    if (pathname.startsWith("/account")) router.push("/");
  };

  const firstName = account.name.split(/\s+/)[0];
  const ITEM = "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm outline-none transition-colors";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm font-semibold transition-all",
          isDark ? "border border-secondary/25 text-secondary hover:bg-secondary/10" : "bg-tertiary/5 text-tertiary hover:bg-tertiary/8",
          isOpen && (isDark ? "bg-secondary/10" : "bg-tertiary/8"),
        )}
      >
        <span aria-hidden="true" className="cta-gradient flex size-8 items-center justify-center rounded-full text-xs font-bold text-secondary">
          {initials(account.name)}
        </span>
        <span className="max-w-28 truncate">{firstName}</span>
        <ChevronDown aria-hidden="true" className={cn("size-4 opacity-70 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Your account"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-50 mt-3 w-72 origin-top-right animate-[fade-up_0.15s_ease-out_both] overflow-hidden rounded-2xl border border-tertiary/8 bg-secondary shadow-2xl shadow-tertiary/25 motion-reduce:animate-none"
        >
          <div className="relative overflow-hidden bg-tertiary px-4 py-4 text-secondary">
            <div aria-hidden="true" className="absolute -right-10 -top-14 size-36 rounded-full bg-primary/40 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <span aria-hidden="true" className="cta-gradient flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {initials(account.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{account.name}</p>
                <p className="truncate text-xs text-secondary/60">{account.detail}</p>
              </div>
            </div>
            <span className="badge-gradient relative mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">{account.badge}</span>
          </div>

          <div className="p-1.5">
            {account.links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className={cn(ITEM, "text-tertiary hover:bg-tertiary/5 focus-visible:bg-tertiary/6")}
                >
                  <Icon aria-hidden="true" className="size-4 text-tertiary/55" />
                  {link.label}
                </Link>
              );
            })}
            <div className="mx-2 my-1 h-px bg-tertiary/8" />
            <button type="button" role="menuitem" onClick={() => void signOut()} className={cn(ITEM, "text-primary hover:bg-primary/6 focus-visible:bg-primary/6")}>
              <LogOut aria-hidden="true" className="size-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
