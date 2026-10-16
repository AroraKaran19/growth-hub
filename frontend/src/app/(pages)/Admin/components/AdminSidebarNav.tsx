"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { isNavGroup, type AdminNavEntry, type AdminNavGroup, type AdminSection } from "@/config/adminPermissions";
import { cn } from "@/utils";

const PageLink = ({ page, active, nested }: { page: AdminSection; active: boolean; nested?: boolean }) => {
  const Icon = page.icon;
  return (
    <Link
      href={page.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors",
        nested && "py-2 pl-3",
        active ? "cta-gradient font-medium text-secondary" : "text-secondary/70 hover:bg-secondary/8 hover:text-secondary",
      )}
    >
      <Icon aria-hidden="true" className={cn("shrink-0", nested ? "size-3.5" : "size-4")} />
      {page.label}
    </Link>
  );
};

const NavGroup = ({ group, isActive }: { group: AdminNavGroup; isActive: (href: string) => boolean }) => {
  const containsActive = group.pages.some((page) => isActive(page.href));
  const [isOpen, setIsOpen] = useState(containsActive);
  const open = isOpen || containsActive;
  const Icon = group.icon;
  const id = `nav-${group.permission}`;

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setIsOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors",
          containsActive ? "font-medium text-secondary" : "text-secondary/70 hover:bg-secondary/8 hover:text-secondary",
        )}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span className="grow text-left">{group.label}</span>
        <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul id={id} className="mt-1 ml-5 flex flex-col gap-0.5 border-l border-secondary/12 pl-2.5">
          {group.pages.map((page) => (
            <li key={page.href}>
              <PageLink page={page} active={isActive(page.href)} nested />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

/** Desktop sidebar: plain links, plus groups that open to show their pages. */
const AdminSidebarNav = ({ entries, isActive }: { entries: AdminNavEntry[]; isActive: (href: string) => boolean }) => (
  <nav aria-label="Admin" className="scrollbar-thin mt-8 min-h-0 overflow-y-auto">
    <ul className="flex flex-col gap-1">
      {entries.map((entry) =>
        isNavGroup(entry) ? (
          <NavGroup key={entry.permission} group={entry} isActive={isActive} />
        ) : (
          <li key={entry.href}>
            <PageLink page={entry} active={isActive(entry.href)} />
          </li>
        ),
      )}
    </ul>
  </nav>
);

export default AdminSidebarNav;
