"use client";

import { useEffect, useState } from "react";
import { CirclePause, X } from "lucide-react";
import type { MemberMembership } from "@/types/membership";
import { cn } from "@/utils";
import { formatDay, todayIso } from "@/utils/date";
import { MAX_PAUSE_DAYS, addDays } from "../membershipCycle";

type PauseMembershipModalProps = {
  membership: MemberMembership;
  onCancel: () => void;
  onConfirm: (today: string, days: number) => void;
};

const DAY_OPTIONS = Array.from({ length: MAX_PAUSE_DAYS }, (_, index) => index + 1);

const PauseMembershipModal = ({
  membership,
  onCancel,
  onConfirm,
}: PauseMembershipModalProps) => {
  // Mounted only after a click, so this is already the viewer's date.
  const [today] = useState(todayIso);
  const [days, setDays] = useState(MAX_PAUSE_DAYS);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const rows = [
    { label: "Paused from", value: `Today, ${formatDay(today)}` },
    { label: "Resumes on", value: formatDay(addDays(today, days)) },
    {
      label: membership.autoRenew ? "Renewal moves to" : "Plan now ends",
      value: formatDay(addDays(membership.cycleEnd, days)),
    },
    { label: "Your seat", value: `${membership.seats.join(", ")}, held` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tertiary/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        aria-describedby="pause-limit"
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

        <span className="flex size-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
          <CirclePause aria-hidden="true" className="size-5" />
        </span>

        <h2 id="pause-title" className="mt-4 text-xl font-bold text-tertiary">
          Pause membership
        </h2>
        <p className="mt-1 text-sm text-tertiary/60">
          {membership.plan} {membership.workspace} at {membership.venueName}.
          Paused days are added to the end of your cycle, so you keep every day
          you paid for.
        </p>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-tertiary">
            How long?
          </legend>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {DAY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                aria-pressed={days === option}
                className={cn(
                  "rounded-lg border py-2.5 text-sm transition-colors",
                  days === option
                    ? "cta-gradient border-transparent font-medium text-secondary"
                    : "border-tertiary/12 text-tertiary hover:border-tertiary/30",
                )}
              >
                {option} {option === 1 ? "day" : "days"}
              </button>
            ))}
          </div>
          <p id="pause-limit" className="mt-2 text-xs text-tertiary/55">
            You can pause for up to {MAX_PAUSE_DAYS} days at a time.
          </p>
        </fieldset>

        <dl className="mt-5 flex flex-col gap-3 rounded-xl bg-tertiary/4 p-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4"
            >
              <dt className="text-sm text-tertiary/60">{row.label}</dt>
              <dd className="text-right text-sm font-medium text-tertiary">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
          >
            Keep active
          </button>
          <button
            type="button"
            onClick={() => onConfirm(today, days)}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            <CirclePause aria-hidden="true" className="size-4" />
            Pause for {days} {days === 1 ? "day" : "days"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PauseMembershipModal;
