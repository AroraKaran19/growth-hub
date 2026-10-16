import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight, MessageCircle, PackageOpen, Phone, Scale } from "lucide-react";
import { CardHeading, QuietLink, RAISED_CARD, REVEAL, plural } from "@/app/components/shared/OverviewUi";
import type { DeskToday } from "@/libs/api/partnerDesk";
import type { CancellationRequest } from "@/types/cancellation";
import type { MemberToTalk } from "@/types/overview";
import { cn } from "@/utils";
import { formatMonthDay } from "@/utils/date";
import { membershipTitle } from "@/utils/membershipLabels";

const CARD = cn(RAISED_CARD, REVEAL, "p-5 sm:p-6");

const Empty = ({ children }: { children: string }) => (
  <p className="mt-4 rounded-xl bg-surface px-4 py-5 text-center text-sm text-tertiary/55">{children}</p>
);

type Handout = { key: string; name: string; where: string; items: { name: string; quantity: number; online: boolean }[] };

/** Add-on orders for today plus add-ons bought with today's passes, one row per person. */
const handoutsOf = (feed: DeskToday): Handout[] => {
  const people = new Map<string, { name: string; where: string }>([
    ...feed.bookings.map((booking) => [booking.ref, { name: booking.member.name, where: booking.seats.join(", ") }] as const),
    ...feed.members.map((member) => [member.ref, { name: member.member.name, where: member.seats.join(", ") }] as const),
  ]);
  const rows = new Map<string, Handout>();
  const rowFor = (ref: string) => {
    const person = people.get(ref);
    const row = rows.get(ref) ?? { key: ref, name: person?.name ?? ref, where: person?.where ?? "", items: [] };
    rows.set(ref, row);
    return row;
  };
  for (const booking of feed.bookings) {
    if (booking.status === "cancelled") continue;
    for (const addon of booking.addons) rowFor(booking.ref).items.push({ name: addon.name, quantity: 1, online: true });
  }
  for (const addon of feed.addons) {
    rowFor(addon.targetRef).items.push({ name: addon.name, quantity: addon.quantity, online: addon.channel === "app" });
  }
  return [...rows.values()];
};

export const AddonsToHand = ({ feed, style }: { feed: DeskToday; style?: CSSProperties }) => {
  const handouts = handoutsOf(feed);
  return (
    <section aria-label="Add-ons to hand out" className={CARD} style={style}>
      <CardHeading icon={PackageOpen} title="Add-ons to hand out" hint={handouts.length ? plural(handouts.length, "person", "people") : undefined} />
      {handouts.length === 0 ? (
        <Empty>No add-ons to hand out today.</Empty>
      ) : (
        <ul className="mt-4 divide-y divide-tertiary/8">
          {handouts.map((handout) => (
            <li key={handout.key} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-tertiary">{handout.name}</p>
                {handout.where && <p className="text-xs text-tertiary/55">{handout.where}</p>}
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {handout.items.map((item, index) => (
                  <li
                    key={`${item.name}-${index}`}
                    title={item.online ? "Paid online" : "Paid at the desk"}
                    className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-tertiary/80 ring-1 ring-primary/15"
                  >
                    {item.name}
                    {item.quantity > 1 ? ` x ${item.quantity}` : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const KIND_LABELS: Record<CancellationRequest["kind"], string> = {
  booking: "Pass",
  membership: "Membership",
  "addon-order": "Add-ons",
};

const DAY_MINUTES = 24 * 60;

const waited = (iso: string, now: number) => {
  const minutes = Math.max(1, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 60) return { label: `${minutes} min`, minutes };
  if (minutes < DAY_MINUTES) return { label: `${Math.floor(minutes / 60)} hr`, minutes };
  return { label: plural(Math.floor(minutes / DAY_MINUTES), "day"), minutes };
};

const SHOWN_REQUESTS = 4;

export const RequestsToDecide = ({ requests, now, style }: { requests: CancellationRequest[]; now: number; style?: CSSProperties }) => {
  const oldestFirst = [...requests].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return (
    <section aria-label="Requests to decide" className={CARD} style={style}>
      <CardHeading
        icon={Scale}
        title="To decide"
        hint={requests.length ? `${plural(requests.length, "cancellation request")} waiting` : undefined}
        action={requests.length > 0 && <QuietLink href="/partner/requests">Decide</QuietLink>}
      />
      {requests.length === 0 ? (
        <Empty>No cancellation requests waiting.</Empty>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {oldestFirst.slice(0, SHOWN_REQUESTS).map((request) => {
            const wait = waited(request.createdAt, now);
            const isSlow = wait.minutes >= DAY_MINUTES;
            return (
              <li key={request.id}>
                <Link
                  href="/partner/requests"
                  className="group flex items-center gap-3 rounded-xl border border-tertiary/8 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-tertiary">{request.member.name}</span>
                    <span className="block text-xs text-tertiary/55">
                      {KIND_LABELS[request.kind]} {request.ref}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                      isSlow ? "bg-amber-500/15 text-amber-800" : "bg-tertiary/6 text-tertiary/70",
                    )}
                  >
                    Waiting {wait.label}
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-tertiary/35 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {requests.length > SHOWN_REQUESTS && (
        <p className="mt-3 text-xs text-tertiary/55">{plural(requests.length - SHOWN_REQUESTS, "more request")} on the requests page.</p>
      )}
    </section>
  );
};

export const MembersToTalk = ({ members, style }: { members: MemberToTalk[]; style?: CSSProperties }) => (
  <section aria-label="Members to talk to" className={CARD} style={style}>
    <CardHeading
      icon={MessageCircle}
      title="Members to talk to"
      hint="Renewal failing, or the plan ends within 7 days"
      action={<QuietLink href="/partner/members">Members</QuietLink>}
    />
    {members.length === 0 ? (
      <Empty>Every member here is renewing normally.</Empty>
    ) : (
      <ul className="mt-4 divide-y divide-tertiary/8">
        {members.map((member) => (
          <li key={member.ref} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-tertiary">{member.member.name}</p>
              <p className="truncate text-xs text-tertiary/55">
                {membershipTitle(member)}, {member.seats.join(", ")}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                member.reason === "past-due" ? "bg-amber-500/15 text-amber-800" : "bg-tertiary/6 text-tertiary/70",
              )}
            >
              {member.reason === "past-due" ? "Renewal failing" : `Ends ${member.endsOn ? formatMonthDay(member.endsOn) : "soon"}`}
            </span>
            {member.member.phone && (
              <a
                href={`tel:${member.member.phone.replace(/\s/g, "")}`}
                aria-label={`Call ${member.member.name}`}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-tertiary/70 ring-1 ring-tertiary/8 transition-colors hover:bg-primary hover:text-secondary"
              >
                <Phone aria-hidden="true" className="size-3.5" />
              </a>
            )}
          </li>
        ))}
      </ul>
    )}
  </section>
);
