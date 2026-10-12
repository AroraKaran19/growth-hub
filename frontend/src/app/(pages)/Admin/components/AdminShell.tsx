"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleUserRound, ExternalLink, LogOut, ShieldQuestion } from "lucide-react";
import Logo from "@/app/components/ui/Logo";
import { isPathAllowed, sectionForPath, visibleNav, visibleSections } from "@/config/adminPermissions";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { useAdminSession } from "@/stores/admin";
import { cn } from "@/utils";
import AdminSidebarNav from "./AdminSidebarNav";

/** Signed-in frame for every admin page: sidebar, top bar and guard. */
const AdminShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { session, account, isReady, signOut } = useAdminSession();

  useAuthBootstrap("admin");

  const links = account ? visibleSections(account) : [];
  const allowed = account ? isPathAllowed(account, pathname) : false;
  const fallback = links[0]?.href;

  useEffect(() => {
    if (account && !allowed && fallback) router.replace(fallback);
  }, [account, allowed, fallback, router]);

  useEffect(() => {
    if (isReady && !session) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, session, pathname, router]);

  const activeHref = sectionForPath(pathname)?.href;
  const isActive = (href: string) => href === activeHref;

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
        <Link href="/" aria-label="Growth Hub home" draggable={false} className="w-fit transition-opacity hover:opacity-85">
          <Logo className="h-10 w-auto text-secondary" />
        </Link>

        <AdminSidebarNav entries={account ? visibleNav(account) : []} isActive={isActive} />

        <div className="mt-auto border-t border-secondary/10 pt-4">
          <Link href="/admin/profile" className="group block rounded-lg transition-opacity hover:opacity-85">
            <p className="text-sm font-medium group-hover:underline">{session.name}</p>
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
            <Link href="/" aria-label="Growth Hub home" draggable={false} className="transition-opacity hover:opacity-85 lg:hidden">
              <Logo className="h-9 w-auto text-tertiary" />
            </Link>
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
              <Link
                href="/admin/profile"
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
            aria-label="Admin sections"
            className="flex gap-1 overflow-x-auto border-t border-tertiary/8 px-4 py-2 sm:px-6 lg:hidden"
          >
            {links.map((link) => {
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

        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {allowed ? (
            children
          ) : fallback ? (
            <p className="text-sm text-tertiary/60" aria-live="polite">
              Taking you to a section you can open...
            </p>
          ) : (
            <div className="mx-auto mt-10 max-w-md rounded-2xl border border-tertiary/8 bg-secondary p-8 text-center shadow-lg shadow-tertiary/5">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldQuestion aria-hidden="true" className="size-6" />
              </span>
              <h1 className="mt-4 text-lg font-bold text-tertiary">No sections yet</h1>
              <p className="mt-1.5 text-sm text-tertiary/60">
                Your account is ready, but no admin sections have been given to you yet. Ask a
                super admin for access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminShell;
