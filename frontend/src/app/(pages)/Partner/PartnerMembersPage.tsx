"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { usePartnerDesk } from "@/stores/partner";
import { MEMBERSHIP_STATUS_LABELS } from "@/types/membership";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import {
  CHECK_IN_BUTTON,
  PARTNER_CARD,
  PartnerPageHeader,
  PartnerSkeleton,
  PartnerStat,
} from "./components/PartnerUi";

const STATUS_STYLE = {
  active: "bg-green-500/12 text-green-700",
  paused: "bg-amber-500/15 text-amber-700",
  expired: "bg-tertiary/8 text-tertiary/70",
};

const PartnerMembersPage = () => {
  const desk = usePartnerDesk();
  const [query, setQuery] = useState("");

  if (!desk.isReady) return <PartnerSkeleton />;

  const search = query.trim().toLowerCase();
  const rows = desk.members.filter(
    (member) =>
      !search ||
      `${member.memberName} ${member.phone} ${member.seats.join(" ")}`
        .toLowerCase()
        .includes(search),
  );

  const active = desk.members.filter((member) => member.status === "active");
  const paused = desk.members.filter((member) => member.status === "paused");
  const inToday = active.filter((member) => desk.checkIns[member.membershipId]);

  return (
    <>
      <PartnerPageHeader
        title="Members"
        description="Members with a reserved seat at this venue. Their seats are held for the whole plan."
      />

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PartnerStat label="Active members" value={String(active.length)} />
        <PartnerStat label="Paused" value={String(paused.length)} hint="Seats held, not in use" />
        <PartnerStat label="Checked in today" value={`${inToday.length} of ${active.length}`} />
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
            placeholder="Name, phone or seat"
            className="w-60 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
          />
        </label>
      </div>

      <div className={`${PARTNER_CARD} mt-4 overflow-x-auto`}>
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-tertiary/60">
            No members match &ldquo;{query}&rdquo;.
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
                    <td className="px-5 py-3.5 text-tertiary/75">
                      {member.plan} {member.workspace}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-tertiary">
                      {member.seats.join(", ")}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLE[member.status],
                        )}
                      >
                        {MEMBERSHIP_STATUS_LABELS[member.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-tertiary/75">
                      {member.status === "paused" && member.resumesOn
                        ? `Resumes ${formatDay(member.resumesOn)}`
                        : `Renews ${formatDay(member.renewsOn)}`}
                    </td>
                    <td className="px-5 py-3.5">
                      {member.status !== "active" ? (
                        <span className="text-xs text-tertiary/45">Not expected</span>
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
                          onClick={() => desk.checkIn(member.membershipId)}
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
    </>
  );
};

export default PartnerMembersPage;
