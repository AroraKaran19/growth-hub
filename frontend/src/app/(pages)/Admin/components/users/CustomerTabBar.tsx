"use client";

import { useRef, type KeyboardEvent } from "react";
import { BadgeIndianRupee, CalendarDays, ReceiptText, UserRound } from "lucide-react";
import { cn } from "@/utils";

export const CUSTOMER_TABS = [
  { value: "details", label: "Details", icon: UserRound },
  { value: "bookings", label: "Bookings", icon: CalendarDays },
  { value: "memberships", label: "Memberships", icon: BadgeIndianRupee },
  { value: "invoices", label: "Invoices", icon: ReceiptText },
] as const;

export type CustomerTab = (typeof CUSTOMER_TABS)[number]["value"];

export const tabId = (prefix: string, tab: CustomerTab) => `${prefix}-tab-${tab}`;
export const panelId = (prefix: string, tab: CustomerTab) => `${prefix}-panel-${tab}`;

type CustomerTabBarProps = { idPrefix: string; value: CustomerTab; onChange: (tab: CustomerTab) => void };

const CustomerTabBar = ({ idPrefix, value, onChange }: CustomerTabBarProps) => {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = CUSTOMER_TABS.findIndex((tab) => tab.value === value);
    const next = CUSTOMER_TABS[(index + step + CUSTOMER_TABS.length) % CUSTOMER_TABS.length].value;
    onChange(next);
    listRef.current?.querySelector<HTMLButtonElement>(`#${tabId(idPrefix, next)}`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Customer records"
      onKeyDown={onKeyDown}
      className="relative mt-5 flex gap-1 overflow-x-auto rounded-full bg-secondary/8 p-1 ring-1 ring-secondary/10 [scrollbar-width:none]"
    >
      {CUSTOMER_TABS.map((tab) => {
        const selected = tab.value === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            id={tabId(idPrefix, tab.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.value)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex shrink-0 grow items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 motion-reduce:transition-none",
              selected ? "bg-secondary text-tertiary shadow-lg shadow-tertiary/30" : "text-secondary/65 hover:bg-secondary/10 hover:text-secondary",
            )}
          >
            <Icon aria-hidden="true" className={cn("size-4", selected ? "text-primary" : "text-current")} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default CustomerTabBar;
