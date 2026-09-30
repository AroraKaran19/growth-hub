"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import {
  MEMBERSHIP_LENGTH_LABELS_BY_KEY,
  MEMBERSHIP_SPACES,
  MEMBERSHIP_UNIT_BY_KEY,
} from "@/data/membershipPlans";
import { useAdminRequests } from "@/hooks/useCancellationRequests";
import { useAdminMemberships } from "@/hooks/useStaffBookings";
import { decideAdminRequest } from "@/libs/api/cancellations";
import { MEMBERSHIP_STATUS_LABELS, isLiveMembership, type MembershipStatus } from "@/types/membership";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
  PartnerStat as Stat,
} from "../Partner/components/PartnerUi";
import RequestBoard from "../Partner/components/RequestBoard";
import MembershipDrawer from "./components/records/MembershipDrawer";
import ViewSwitch from "./components/records/ViewSwitch";

type ShownStatus = Exclude<MembershipStatus, "pending-payment" | "expired">;

const SHOWN_STATUSES: ShownStatus[] = ["active", "past-due", "ended", "lapsed", "cancelled"];

const STATUS_STYLE: Record<ShownStatus, string> = {
  active: "bg-green-500/12 text-green-700",
  "past-due": "bg-amber-500/15 text-amber-700",
  ended: "bg-tertiary/8 text-tertiary/70",
  lapsed: "bg-primary/10 text-primary",
  cancelled: "bg-primary/10 text-primary",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...SHOWN_STATUSES.map((value) => ({ value, label: MEMBERSHIP_STATUS_LABELS[value] })),
];

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const AdminMembershipsPage = () => {
  const { memberships, error, isLoading, mutate } = useAdminMemberships();
  const [view, setView] = useState<"all" | "requests">("all");
  const [requestTab, setRequestTab] = useState<"open" | "decided">("open");
  const [openRef, setOpenRef] = useState<string | null>(null);
  const waiting = useAdminRequests("open", "membership");
  const decided = useAdminRequests("decided", "membership", view === "requests");
  const shownRequests = requestTab === "open" ? waiting : decided;
  const [venue, setVenue] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  if (isLoading) return <Skeleton />;

  const venueOptions = [
    { value: "", label: "All venues" },
    ...[...new Map(memberships.map((item) => [item.venue.slug, item.venue.name]))]
      .sort(([, a], [, b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label })),
  ];

  const search = query.trim().toLowerCase();
  const rows = memberships
    .filter((item) => !venue || item.venue.slug === venue)
    .filter((item) => !status || item.status === status)
    .filter(
      (item) =>
        !search ||
        `${item.ref} ${item.venue.name} ${item.member.name} ${item.member.phone} ${item.seats.join(" ")}`
          .toLowerCase()
          .includes(search),
    );

  const live = memberships.filter(isLiveMembership);
  const pastDue = live.filter((item) => item.status === "past-due").length;
  const stopping = live.filter((item) => item.cancelAtCycleEnd).length;

  return (
    <>
      <PageHeader
        title="Memberships"
        description="Reserved seats across all venues. Plans renew through Razorpay until the member stops them."
      />

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Live plans" value={String(live.length)} hint={`${memberships.length} paid in total`} />
        <Stat label="Payment failed" value={String(pastDue)} hint="Seat kept while Razorpay retries" />
        <Stat label="Stopping" value={String(stopping)} hint="Ends when the paid time runs out" />
      </dl>

      <div className="mt-6">
        <ViewSwitch
          value={view}
          onChange={setView}
          views={[
            { value: "all", label: "All memberships" },
            { value: "requests", label: "Cancellation requests", badge: waiting.requests.length },
          ]}
        />
      </div>

      {view === "requests" ? (
        <div className="mt-5">
          <RequestBoard
            tab={requestTab}
            onTabChange={setRequestTab}
            openCount={waiting.requests.length}
            requests={shownRequests.requests}
            isLoading={shownRequests.isLoading}
            hasError={Boolean(shownRequests.error)}
            showVenue
            onDecide={async (request, decision) => {
              await decideAdminRequest(request.id, decision);
              await Promise.all([waiting.mutate(), decided.mutate(), mutate()]);
            }}
          />
        </div>
      ) : (
      <>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
        <label className="relative">
          <span className="sr-only">Search memberships</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary/45" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID, member, phone or seat"
            className="w-64 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
          />
        </label>
        <SelectField label="Filter by venue" hideLabel value={venue} onChange={setVenue} options={venueOptions} className="w-56" />
        <SelectField label="Filter by status" hideLabel value={status} onChange={setStatus} options={STATUS_OPTIONS} className="w-44" />
      </div>

      <div className={`${CARD} mt-4 overflow-x-auto`}>
        {error ? (
          <p role="alert" className="px-6 py-14 text-center text-sm text-primary">
            We couldn&apos;t load memberships. Refresh to try again.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-tertiary/60">
            {memberships.length === 0 ? "No memberships yet." : "No memberships match these filters."}
          </p>
        ) : (
          <table className="w-full min-w-4xl text-left text-sm">
            <thead className="border-b border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Membership ID</th>
                <th scope="col" className="px-5 py-3 font-semibold">Member</th>
                <th scope="col" className="px-5 py-3 font-semibold">Venue</th>
                <th scope="col" className="px-5 py-3 font-semibold">Plan</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Price</th>
                <th scope="col" className="px-5 py-3 font-semibold">Dates</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/8">
              {rows.map((item) => {
                const shown = item.status as ShownStatus;
                return (
                  <tr key={item.ref} className="cursor-pointer transition-colors hover:bg-tertiary/3" onClick={() => setOpenRef(item.ref)}>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => setOpenRef(item.ref)}
                        className="font-mono text-primary underline-offset-4 hover:underline"
                      >
                        {item.ref}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-tertiary">{item.member.name}</p>
                      <p className="text-xs text-tertiary/55">{item.member.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-tertiary">{item.venue.name}</td>
                    <td className="px-5 py-3.5 text-tertiary/75">
                      <p>
                        {MEMBERSHIP_LENGTH_LABELS_BY_KEY[item.length] ?? item.length}{" "}
                        {MEMBERSHIP_SPACES[item.spaceType].workspace}
                      </p>
                      <p className="text-xs text-tertiary/55">{item.seats.join(", ")}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right text-tertiary">
                      {rupees(item.cyclePrice)}
                      <span className="text-xs text-tertiary/55"> / {MEMBERSHIP_UNIT_BY_KEY[item.length] ?? "cycle"}</span>
                    </td>
                    <td className="px-5 py-3.5 text-tertiary/75">
                      <p>From {formatDay(item.startDate)}</p>
                      <p className="text-xs text-tertiary/55">
                        {item.renewsOn
                          ? `Renews ${formatDay(item.renewsOn)}`
                          : item.paidThrough
                            ? `Paid through ${formatDay(item.paidThrough)}`
                            : "Not paid"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[shown])}>
                        {MEMBERSHIP_STATUS_LABELS[item.status] ?? item.status}
                      </span>
                      {isLiveMembership(item) && item.cancelAtCycleEnd && (
                        <span className="ml-1.5 rounded-full bg-tertiary/8 px-2 py-0.5 text-xs text-tertiary/70">Stopping</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {memberships.length >= 200 && (
        <p className="mt-3 text-xs text-tertiary/55">Showing the newest 200 memberships.</p>
      )}
      </>
      )}

      {openRef && (
        <MembershipDrawer
          membershipRef={openRef}
          onClose={() => setOpenRef(null)}
          onChanged={() => void Promise.all([mutate(), waiting.mutate(), decided.mutate()])}
        />
      )}
    </>
  );
};

export default AdminMembershipsPage;
