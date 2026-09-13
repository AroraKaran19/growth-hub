"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, CircleCheck } from "lucide-react";
import type { MemberMembership } from "@/types/membership";
import { formatDay } from "@/utils/date";
import MembershipCard from "./components/MembershipCard";
import MembershipHistoryRow from "./components/MembershipHistoryRow";
import PauseMembershipModal from "./components/PauseMembershipModal";
import ResumeMembershipModal from "./components/ResumeMembershipModal";
import { useMemberMemberships } from "./useMemberMemberships";

const HISTORY_PAGE_SIZE = 3;

type Dialog =
  | { kind: "pause"; membership: MemberMembership }
  | { kind: "resume"; membership: MemberMembership };

type Notice = { kind: "paused" | "resumed"; id: string };

const MembershipsPage = () => {
  const { memberships, pause, resume } = useMemberMemberships();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [historyShown, setHistoryShown] = useState(HISTORY_PAGE_SIZE);

  const active = memberships.filter((item) => item.status === "active");
  const paused = memberships.filter((item) => item.status === "paused");
  const history = memberships
    .filter((item) => item.status === "expired")
    .sort((a, b) => b.cycleEnd.localeCompare(a.cycleEnd));

  const hoursLeft = active.reduce(
    (total, item) =>
      total +
      Math.max(item.meetingRoomHours.included - item.meetingRoomHours.used, 0),
    0,
  );

  const nextRenewal = active
    .filter((item) => item.autoRenew)
    .map((item) => item.cycleEnd)
    .sort()
    .at(0);

  const stats = [
    { label: "Active memberships", value: String(active.length) },
    { label: "Meeting room hours left", value: `${hoursLeft} hrs` },
    {
      label: "Next renewal",
      value: nextRenewal ? formatDay(nextRenewal) : "None",
    },
  ];

  const noticed = notice && memberships.find((item) => item.id === notice.id);
  const remainingHistory = history.length - historyShown;

  const openPause = (membership: MemberMembership) =>
    setDialog({ kind: "pause", membership });
  const openResume = (membership: MemberMembership) =>
    setDialog({ kind: "resume", membership });

  const groups = [
    { title: "Active", items: active },
    { title: "Paused", items: paused },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tertiary">My Memberships</h1>
          <p className="mt-1 text-sm text-tertiary/60">
            Your regular desks and cabins, what each plan includes, and when it
            renews.
          </p>
        </div>
        <Link
          href="/memberships"
          className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
        >
          Explore plans
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>

      {noticed && (
        <p
          role="status"
          className="mt-5 flex items-center gap-2 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-800"
        >
          <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
          {notice.kind === "paused" && noticed.resumesOn
            ? `${noticed.venueName} is paused until ${formatDay(noticed.resumesOn)}. Your renewal moves to ${formatDay(noticed.cycleEnd)}.`
            : `${noticed.venueName} is active again. It renews on ${formatDay(noticed.cycleEnd)}.`}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-tertiary/10 pt-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-tertiary/10 border-b-2 border-b-primary bg-secondary px-4 py-3.5"
          >
            <dt className="text-sm text-tertiary/60">{stat.label}</dt>
            <dd className="mt-1 text-xl font-bold text-tertiary">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <section key={group.title} className="mt-7">
              <h2 className="text-lg font-bold text-tertiary">{group.title}</h2>
              <div className="mt-4 flex flex-col gap-4">
                {group.items.map((membership) => (
                  <MembershipCard
                    key={membership.id}
                    membership={membership}
                    onPause={openPause}
                    onResume={openResume}
                  />
                ))}
              </div>
            </section>
          ),
      )}

      {history.length > 0 && (
        <section className="mt-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-tertiary">History</h2>
            <p className="text-sm text-tertiary/55">
              Showing {Math.min(historyShown, history.length)} of{" "}
              {history.length}
            </p>
          </div>

          <ul
            id="membership-history"
            className="mt-4 divide-y divide-tertiary/8 rounded-2xl border border-tertiary/10 bg-secondary"
          >
            {history.slice(0, historyShown).map((membership) => (
              <MembershipHistoryRow
                key={membership.id}
                membership={membership}
              />
            ))}
          </ul>

          {history.length > HISTORY_PAGE_SIZE && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                aria-controls="membership-history"
                onClick={() =>
                  setHistoryShown((shown) =>
                    remainingHistory > 0
                      ? shown + HISTORY_PAGE_SIZE
                      : HISTORY_PAGE_SIZE,
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-tertiary/20 px-5 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
              >
                {remainingHistory > 0
                  ? `Load ${Math.min(remainingHistory, HISTORY_PAGE_SIZE)} more`
                  : "Show less"}
                <ChevronDown
                  aria-hidden="true"
                  className={
                    remainingHistory > 0
                      ? "size-4"
                      : "size-4 rotate-180"
                  }
                />
              </button>
            </div>
          )}
        </section>
      )}

      {dialog?.kind === "pause" && (
        <PauseMembershipModal
          membership={dialog.membership}
          onCancel={() => setDialog(null)}
          onConfirm={(today, days) => {
            pause(dialog.membership, today, days);
            setNotice({ kind: "paused", id: dialog.membership.id });
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "resume" && (
        <ResumeMembershipModal
          membership={dialog.membership}
          onCancel={() => setDialog(null)}
          onConfirm={(today) => {
            resume(dialog.membership, today);
            setNotice({ kind: "resumed", id: dialog.membership.id });
            setDialog(null);
          }}
        />
      )}
    </>
  );
};

export default MembershipsPage;
