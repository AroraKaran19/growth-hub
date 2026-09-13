"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import type { MemberMembership } from "@/types/membership";
import { formatDay, todayIso } from "@/utils/date";
import { addDays, unusedPauseDays } from "../membershipCycle";

type ResumeMembershipModalProps = {
  membership: MemberMembership;
  onCancel: () => void;
  onConfirm: (today: string) => void;
};

const ResumeMembershipModal = ({
  membership,
  onCancel,
  onConfirm,
}: ResumeMembershipModalProps) => {
  // Mounted only after a click, so this is already the viewer's date.
  const [today] = useState(todayIso);
  const unused = unusedPauseDays(membership, today);
  const newCycleEnd = addDays(membership.cycleEnd, -unused);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const rows = [
    { label: "Resumes", value: `Today, ${formatDay(today)}` },
    {
      label: "Unused pause",
      value: `${unused} ${unused === 1 ? "day" : "days"}`,
    },
    {
      label: membership.autoRenew ? "Renews on" : "Plan ends",
      value: formatDay(newCycleEnd),
    },
    { label: "Your seat", value: membership.seats.join(", ") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tertiary/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-title"
        className="relative w-full max-w-md rounded-2xl bg-secondary p-6 sm:p-8"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-tertiary/50 transition-colors hover:text-tertiary"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        <span className="flex size-12 items-center justify-center rounded-full bg-green-500/12 text-green-700">
          <Play aria-hidden="true" className="size-5" />
        </span>

        <h2 id="resume-title" className="mt-4 text-xl font-bold text-tertiary">
          Resume membership?
        </h2>
        <p className="mt-1 text-sm text-tertiary/60">
          {membership.plan} {membership.workspace} at {membership.venueName}{" "}
          picks up where it left off, with the hours and guest passes you had.
          Unused pause days come off the end of your cycle.
        </p>

        <dl className="mt-5 flex flex-col gap-3 rounded-xl bg-tertiary/4 p-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4"
            >
              <dt className="text-sm text-tertiary/60">{row.label}</dt>
              <dd className="text-sm font-medium text-tertiary">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
          >
            Keep paused
          </button>
          <button
            type="button"
            onClick={() => onConfirm(today)}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            <Play aria-hidden="true" className="size-4" />
            Resume now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeMembershipModal;
