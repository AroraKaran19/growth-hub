"use client";

import Link from "next/link";
import {
  Banknote,
  ChevronRight,
  Coffee,
  CreditCard,
  FileWarning,
  Hourglass,
  Landmark,
  LifeBuoy,
  ListTodo,
  Store,
  type LucideIcon,
} from "lucide-react";
import { CardHeading, RAISED_CARD, REVEAL, plural, revealDelay } from "@/app/components/shared/OverviewUi";
import type { AdminOverview, CantSellReason } from "@/types/overview";
import { cn } from "@/utils";

const REASONS: Record<CantSellReason, string> = {
  "no-map": "No seat map",
  "placeholder-map": "Placeholder map",
  "no-prices": "No prices or plans",
};

type Todo = {
  key: string;
  count: number;
  title: string;
  detail: string;
  href: string;
  permission: string;
  icon: LucideIcon;
  venues?: NonNullable<AdminOverview["todo"]["venuesThatCantSell"]>;
};

const todosOf = (todo: AdminOverview["todo"]): Todo[] => {
  const cantSell = todo.venuesThatCantSell ?? [];
  const items: Todo[] = [
    {
      key: "invoices",
      count: todo.failedInvoices ?? 0,
      title: `${plural(todo.failedInvoices ?? 0, "invoice")} couldn't be generated`,
      detail: "Customers are waiting on these PDFs. Retry them from Invoices.",
      href: "/admin/invoices",
      permission: "payouts",
      icon: FileWarning,
    },
    {
      key: "past-due",
      count: todo.pastDueMemberships ?? 0,
      title: `${plural(todo.pastDueMemberships ?? 0, "membership")} with a failing renewal`,
      detail: "Razorpay is retrying. The member may need to update their card.",
      href: "/admin/memberships",
      permission: "memberships.manage",
      icon: CreditCard,
    },
    {
      key: "booking-requests",
      count: todo.staleBookingRequests ?? 0,
      title: `${plural(todo.staleBookingRequests ?? 0, "pass or add-on request")} waiting over 48 hours`,
      detail: "The venue hasn't decided. See Cancellation requests under Bookings.",
      href: "/admin/bookings",
      permission: "bookings",
      icon: Hourglass,
    },
    {
      key: "membership-requests",
      count: todo.staleMembershipRequests ?? 0,
      title: `${plural(todo.staleMembershipRequests ?? 0, "membership request")} waiting over 48 hours`,
      detail: "The venue hasn't decided. See Cancellation requests under Memberships.",
      href: "/admin/memberships",
      permission: "memberships.manage",
      icon: Hourglass,
    },
    {
      key: "support",
      count: todo.staleSupportRequests ?? 0,
      title: `${plural(todo.staleSupportRequests ?? 0, "support request")} waiting over 24 hours`,
      detail: "No reply from Growth Hub since the customer last wrote. Reply from Support requests.",
      href: "/admin/support?waiting=1",
      permission: "support",
      icon: LifeBuoy,
    },
    {
      key: "statements",
      count: todo.unpaidStatements ?? 0,
      title: `${plural(todo.unpaidStatements ?? 0, "statement")} issued over a week ago, still unpaid`,
      detail: "Record the transfer on Payouts once it's made.",
      href: "/admin/payouts",
      permission: "payouts",
      icon: Landmark,
    },
    {
      key: "bank",
      count: todo.venuesWithoutBankDetails ?? 0,
      title: `${plural(todo.venuesWithoutBankDetails ?? 0, "live venue")} without bank details`,
      detail: "Payouts can't be sent until they're added on Payouts.",
      href: "/admin/payouts",
      permission: "payouts",
      icon: Banknote,
    },
    {
      key: "cant-sell",
      count: cantSell.length,
      title: `${plural(cantSell.length, "live venue")} can't sell anything`,
      detail: "Customers can open the page but can't book or buy a plan.",
      href: cantSell.length === 1 ? `/admin/venues/${cantSell[0].slug}` : "/admin/venues",
      permission: "workspaces.venues",
      icon: Store,
      venues: cantSell,
    },
  ];
  return items.filter((item) => item.count > 0);
};

const TodoList = ({ todo, canOpen }: { todo: AdminOverview["todo"]; canOpen: (permission: string) => boolean }) => {
  const items = todosOf(todo).filter((item) => canOpen(item.permission));
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section aria-label="To-do" className={cn(RAISED_CARD, REVEAL, "p-5 sm:p-6")}>
      <CardHeading
        icon={ListTodo}
        title="To-do"
        hint={items.length ? "Each one links to where it's fixed." : undefined}
        action={
          items.length > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {plural(total, "thing")} to sort
            </span>
          )
        }
      />

      {items.length === 0 ? (
        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-surface px-5 py-6">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-tertiary/70 shadow-sm">
            <Coffee aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-tertiary">Nothing needs you</p>
            <p className="mt-0.5 text-sm text-tertiary/60">Invoices, renewals, requests and payouts are all on track.</p>
          </div>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-2.5">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={item.key} className={REVEAL} style={revealDelay(index + 1)}>
                <div className="group relative rounded-xl border border-tertiary/8 bg-secondary transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <Link href={item.href} className="flex items-center gap-3.5 p-3.5 sm:p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/12 text-amber-700">
                      <Icon aria-hidden="true" className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-tertiary">{item.title}</span>
                      <span className="block text-xs text-tertiary/60">{item.detail}</span>
                    </span>
                    <span className="hidden text-2xl font-bold text-tertiary sm:block">{item.count}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-tertiary/35 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-700"
                    />
                  </Link>
                  {item.venues && item.venues.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 px-3.5 pb-3.5 sm:pl-17">
                      {item.venues.map((venue) => (
                        <Link
                          key={venue.slug}
                          href={`/admin/venues/${venue.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs text-tertiary/75 ring-1 ring-tertiary/8 transition-colors hover:bg-amber-500/10 hover:text-tertiary"
                        >
                          <span className="font-medium text-tertiary">{venue.name}</span>
                          <span className="text-tertiary/50">{REASONS[venue.reason]}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {item.venues?.length === 1 && (
                    <p className="px-3.5 pb-3.5 text-xs text-tertiary/60 sm:pl-17">
                      {item.venues[0].name}: {REASONS[item.venues[0].reason].toLowerCase()}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default TodoList;
