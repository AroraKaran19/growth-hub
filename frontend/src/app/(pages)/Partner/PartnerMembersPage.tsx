"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { usePartnerDesk } from "@/stores/partner";
import { MEMBERSHIP_STATUS_LABELS, type MembershipStatus } from "@/types/membership";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import { scheduleLabel } from "@/utils/membershipLabels";
import {
  CHECK_IN_BUTTON,
  PARTNER_CARD,
  PartnerPageHeader,
  PartnerSkeleton,
  PartnerStat,
} from "./components/PartnerUi";
import DeskAddonModal, { type DeskAddonSubject } from "./components/DeskAddonModal";
import SeatCheckIns from "./components/SeatCheckIns";
import TodayAddonsCell from "./components/TodayAddonsCell";

const STATUS_STYLE: Partial<Record<MembershipStatus, string>> = {
  active: "bg-green-500/12 text-green-700",
  "past-due": "bg-amber-500/15 text-amber-700",
};

const PartnerMembersPage = () => {
  const desk = usePartnerDesk();
  const [query, setQuery] = useState("");
  const [addonsFor, setAddonsFor] = useState<DeskAddonSubject | null>(null);

  if (!desk.isReady) return <PartnerSkeleton />;

  const search = query.trim().toLowerCase();
  const rows = desk.members.filter(
    (member) =>
      !search ||
      `${member.memberName} ${member.phone} ${member.plan} ${member.seatList.map((seat) => `${seat.label} ${seat.holder ?? ""}`).join(" ")}`
        .toLowerCase()
        .includes(search),
  );

  const pastDue = desk.members.filter((member) => member.status === "past-due");
  // Counted per seat, since each holder on a multi-seat plan checks in separately.
  const seatsDue = desk.todayMembers.flatMap((member) => member.today?.seats ?? []);
  const seatsIn = seatsDue.filter((seat) => seat.checkedInAt);

  return (
    <>
      <PartnerPageHeader
        title="Members"
        description="Members with a reserved seat or room at this venue, held on the days their plan covers."
      />

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PartnerStat label="Active members" value={String(desk.members.length)} />
        <PartnerStat
          label="Payment failed"
          value={String(pastDue.length)}
          hint="Seat kept while Razorpay retries"
        />
        <PartnerStat
          label="Checked in today"
          value={`${seatsIn.length} of ${seatsDue.length}`}
          hint={`Seats due from ${desk.todayMembers.length} ${desk.todayMembers.length === 1 ? "plan" : "plans"}`}
        />
      </dl>

      <div className="mt-6 flex justify-end">
        <label className="relative">
          <span className="sr-only">Search members</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary/45"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, plan, seat or holder"
            className="w-60 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
          />
        </label>
      </div>

      <div className={`${PARTNER_CARD} mt-4 overflow-x-auto`}>
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-tertiary/60">
            {search
              ? <>No members match &ldquo;{query}&rdquo;.</>
              : "No memberships at this venue yet. They appear here once a member pays."}
          </p>
        ) : (
          <table className="w-full min-w-3xl text-left text-sm">
            <thead className="border-b border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Member</th>
                <th scope="col" className="px-5 py-3 font-semibold">Plan</th>
                <th scope="col" className="px-5 py-3 font-semibold">Seat</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold">Dates</th>
                <th scope="col" className="px-5 py-3 font-semibold">Add-ons today</th>
                <th scope="col" className="px-5 py-3 font-semibold">Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/8">
              {rows.map((member) => {
                const checkedIn = desk.checkIns[member.membershipId];
                return (
                  <tr key={member.membershipId}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-tertiary">{member.memberName}</p>
                      <p className="text-xs text-tertiary/55">{member.phone}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-tertiary">{member.plan}</p>
                      <p className="text-xs text-tertiary/55">
                        {scheduleLabel({ plan: member.planSnapshot, window: member.window })}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <ul className="flex flex-col gap-0.5">
                        {member.seatList.map((seat) => (
                          <li key={seat.id} className="text-tertiary">
                            <span className="font-medium">{seat.label}</span>
                            {seat.holder && <span className="text-xs text-tertiary/60"> {seat.holder}</span>}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLE[member.status] ?? "bg-tertiary/8 text-tertiary/70",
                        )}
                      >
                        {MEMBERSHIP_STATUS_LABELS[member.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-tertiary/75">
                      {member.startDate > desk.today
                        ? `Starts ${formatDay(member.startDate)}`
                        : member.renewsOn
                          ? `Renews ${formatDay(member.renewsOn)}`
                          : `Ends ${formatDay(member.paidThrough)}`}
                    </td>
                    <td className="px-5 py-3.5">
                      {member.startDate > desk.today || member.paidThrough < desk.today ? (
                        <span className="text-xs text-tertiary/45">None</span>
                      ) : (
                        <TodayAddonsCell
                          addons={desk.addonsByTarget[member.membershipId] ?? []}
                          name={member.memberName}
                          onAdd={() =>
                            setAddonsFor({
                              kind: "member",
                              ref: member.membershipId,
                              name: member.memberName,
                              people: member.people,
                              paidThrough: member.paidThrough,
                            })
                          }
                        />
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {member.startDate > desk.today ? (
                        <span className="text-xs text-tertiary/45">Not started</span>
                      ) : !member.today ? (
                        <span className="text-xs text-tertiary/45">Not due today</span>
                      ) : member.seatList.length > 1 ? (
                        <SeatCheckIns
                          seats={member.today.seats}
                          memberName={member.memberName}
                          onCheckIn={(seatId) => desk.quickCheckIn(member.membershipId, seatId)}
                        />
                      ) : checkedIn ? (
                        <span className="text-xs font-medium text-blue-700">
                          In since{" "}
                          {new Date(checkedIn).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void desk.quickCheckIn(member.membershipId)}
                          className={CHECK_IN_BUTTON}
                        >
                          Check in
                          <span className="sr-only"> {member.memberName}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {addonsFor && (
        <DeskAddonModal
          subject={addonsFor}
          offers={desk.venue.addons}
          openDays={desk.venue.openDays}
          today={desk.today}
          existing={desk.addonsByTarget[addonsFor.ref] ?? []}
          voidable={desk.salesByTarget[addonsFor.ref] ?? []}
          onRecord={desk.recordAddons}
          onVoid={desk.voidAddons}
          onClose={() => setAddonsFor(null)}
        />
      )}
    </>
  );
};

export default PartnerMembersPage;
