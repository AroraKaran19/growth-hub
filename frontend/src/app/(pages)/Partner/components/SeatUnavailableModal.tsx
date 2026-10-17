"use client";

import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  Check,
  Clock,
  Power,
  Store,
  TriangleAlert,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import DateField from "@/app/components/ui/form/DateField";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import SelectField from "@/app/components/ui/form/SelectField";
import { readApiError } from "@/libs/api/errors";
import {
  markSeatUnavailable,
  previewSeatUnavailable,
  type SeatConflict,
  type SeatMoment,
  type SeatUnavailableInput,
  type UnavailablePreview,
  type UnavailableReason,
} from "@/libs/api/partnerDesk";
import { toastDone } from "@/libs/toast";
import type { DayHours } from "@/types/catalogue";
import { SEAT_TYPE_LABELS, type Seat } from "@/types/seat";
import { cn } from "@/utils";
import { indiaMomentLabel, isoDayLabel } from "@/utils/outages";
import {
  clockLabel,
  CONFLICT_KIND_LABELS,
  conflictDays,
  currentSlot,
  defaultPeriod,
  hoursLabel,
  indiaMinutesNow,
  lastAllowedDay,
  periodErrors,
  summarySentence,
  timeOptions,
} from "../seatUnavailable";

type Step = 1 | 2 | 3;

const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: "What happened" },
  { step: 2, label: "When" },
  { step: 3, label: "Confirm" },
];

const REASONS: { reason: UnavailableReason; title: string; detail: string; icon: LucideIcon; tile: string }[] = [
  {
    reason: "out-of-service",
    title: "Out of service",
    detail: "Broken, being cleaned or under maintenance.",
    icon: Wrench,
    tile: "bg-tertiary text-secondary",
  },
  {
    reason: "taken",
    title: "Taken by someone at the desk",
    detail: "A walk-in, or a sale made offline.",
    icon: Store,
    tile: "cta-gradient text-secondary",
  },
];

const PRIMARY =
  "cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";

const QUIET_LINK = "text-sm font-medium text-tertiary/70 underline-offset-4 transition-colors hover:text-primary hover:underline";

const PANEL = "rounded-2xl bg-secondary p-4 shadow-md shadow-tertiary/6 ring-1 ring-tertiary/8 sm:p-5";

type SeatUnavailableModalProps = {
  seat: Seat;
  hours: DayHours[];
  /** The venue's India date. */
  today: string;
  /** When the modal opened, so the defaults stay put while it is open. */
  openedAt: number;
  onDone: () => Promise<unknown>;
  onClose: () => void;
};

const Stepper = ({ step }: { step: Step }) => (
  <ol className="relative mt-5 flex items-center gap-2" aria-label="Steps">
    {STEPS.map((item, index) => {
      const isDone = item.step < step;
      const isOn = item.step === step;
      return (
        <li key={item.step} className="flex min-w-0 flex-1 items-center gap-2">
          <span
            aria-current={isOn ? "step" : undefined}
            className={cn(
              "inline-flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-medium transition-all duration-300",
              isOn ? "bg-secondary text-tertiary shadow-lg shadow-black/20" : "bg-secondary/10 text-secondary/70",
            )}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                isOn ? "cta-gradient text-secondary" : isDone ? "bg-secondary/90 text-tertiary" : "bg-secondary/15",
              )}
            >
              {isDone ? <Check aria-hidden="true" className="size-3.5" /> : item.step}
            </span>
            <span className="truncate">{item.label}</span>
          </span>
          {index < STEPS.length - 1 && (
            <span aria-hidden="true" className="relative hidden h-0.5 flex-1 overflow-hidden rounded-full bg-secondary/15 sm:block">
              <span
                className={cn(
                  "cta-gradient absolute inset-y-0 left-0 transition-all duration-500 motion-reduce:transition-none",
                  isDone ? "w-full" : "w-0",
                )}
              />
            </span>
          )}
        </li>
      );
    })}
  </ol>
);

const ConflictRow = ({ conflict }: { conflict: SeatConflict }) => (
  <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3 shadow-sm ring-1 ring-tertiary/8">
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-tertiary">
        {conflict.member}
        <span className="rounded-full bg-tertiary/6 px-2 py-0.5 text-[11px] font-medium text-tertiary/65">
          {CONFLICT_KIND_LABELS[conflict.kind]}
        </span>
      </p>
      {conflict.kind !== "walk-in" && <p className="mt-0.5 font-mono text-xs text-tertiary/55">{conflict.ref}</p>}
    </div>
    <div className="text-right text-xs text-tertiary/70">
      <p className="font-medium text-tertiary">{conflictDays(conflict)}</p>
      <p className="mt-0.5">{conflict.time}</p>
    </div>
  </li>
);

/** Takes a seat off sale for a while: out of service, or held for a desk sale. */
const SeatUnavailableModal = ({ seat, hours, today, openedAt, onDone, onClose }: SeatUnavailableModalProps) => {
  const [defaults] = useState(() => defaultPeriod(hours, today, indiaMinutesNow(openedAt)));
  const [step, setStep] = useState<Step>(1);
  const [reason, setReason] = useState<UnavailableReason | null>(null);
  const [from, setFrom] = useState<SeatMoment>(defaults.from);
  const [until, setUntil] = useState<SeatMoment>(defaults.until);
  const [isOpenEnded, setIsOpenEnded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ from?: string; until?: string; reason?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<UnavailablePreview | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const onEscape = useEffectEvent(onClose);
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (step > 1) headingRef.current?.focus();
  }, [step]);

  const nowMinutes = indiaMinutesNow(openedAt);
  const earliest = currentSlot(today, nowMinutes);
  const lastDay = lastAllowedDay(today);
  const endsOpen = reason === "out-of-service" && isOpenEnded;

  const input = (): SeatUnavailableInput => ({ reason: reason!, from, until: endsOpen ? null : until });

  const pickReason = (next: UnavailableReason) => {
    setReason(next);
    setFieldErrors({});
    if (next === "taken") setIsOpenEnded(false);
  };

  const onReasonKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!move) return;
    event.preventDefault();
    const index = (Math.max(0, REASONS.findIndex((item) => item.reason === reason)) + move + REASONS.length) % REASONS.length;
    pickReason(REASONS[index].reason);
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='radio']")[index]?.focus();
  };

  const goToWhen = () => {
    if (!reason) return setFieldErrors({ reason: "Pick what happened." });
    setError(null);
    setStep(2);
  };

  const check = async () => {
    const problems = periodErrors(from, endsOpen ? null : until, today, nowMinutes);
    setFieldErrors(problems);
    if (problems.from || problems.until) return;
    setIsBusy(true);
    setError(null);
    try {
      setPreview(await previewSeatUnavailable(seat.id, input()));
      setStep(3);
    } catch (caught) {
      const info = readApiError(caught);
      if (info.fields.from || info.fields.until) setFieldErrors({ from: info.fields.from, until: info.fields.until });
      else setError(info.message);
    } finally {
      setIsBusy(false);
    }
  };

  const confirm = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await markSeatUnavailable(seat.id, input());
      await onDone();
      toastDone(reason === "taken" ? `${seat.label} is marked as taken.` : `${seat.label} is out of service for that time.`);
      onClose();
    } catch (caught) {
      const info = readApiError(caught);
      if (info.code === "SEAT_IN_USE" && preview && Array.isArray(info.meta.conflicts)) {
        setPreview({ ...preview, conflicts: info.meta.conflicts as SeatConflict[] });
      }
      setError(info.message);
      setIsBusy(false);
    }
  };

  const back = () => {
    setError(null);
    setStep((current) => (current > 1 ? ((current - 1) as Step) : current));
  };

  const conflicts = preview?.conflicts ?? [];
  const hasWalkIn = conflicts.some((item) => item.kind === "walk-in");
  const hasPeople = conflicts.some((item) => item.kind !== "walk-in");

  const setMoment = (side: "from" | "until", next: Partial<SeatMoment>) => {
    setFieldErrors((current) => ({ ...current, [side]: undefined }));
    if (side === "from") setFrom((current) => ({ ...current, ...next }));
    else setUntil((current) => ({ ...current, ...next }));
  };

  const fieldError = (message?: string) =>
    message && (
      <p role="alert" className="mt-2 text-xs font-medium text-primary">
        {message}
      </p>
    );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tertiary/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seat-unavailable-title"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-secondary shadow-2xl"
      >
        <div className="relative shrink-0 overflow-hidden bg-tertiary px-6 pb-5 pt-5 text-secondary">
          <div aria-hidden="true" className="cta-banner absolute -right-12 -top-16 size-44 rounded-full opacity-30 blur-3xl" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-1 text-secondary/60 transition-colors hover:text-secondary"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <p className="relative flex items-center gap-2 text-sm text-secondary/70">
            <CalendarClock aria-hidden="true" className="size-4" />
            {SEAT_TYPE_LABELS[seat.type]}
            {seat.capacity ? `, seats ${seat.capacity}` : ""}
          </p>
          <h2 id="seat-unavailable-title" className="relative mt-1 text-xl font-bold">
            Mark {seat.label} as unavailable
          </h2>
          <Stepper step={step} />
        </div>

        <div key={step} className="flex animate-[fade-up_0.25s_ease-out_both] flex-col gap-5 overflow-y-auto bg-surface p-6 motion-reduce:animate-none">
          {step === 1 && (
            <fieldset aria-required="true">
              <legend className="text-base font-semibold text-tertiary">
                What happened?
                <RequiredMark />
              </legend>
              <div role="radiogroup" aria-label="What happened?" onKeyDown={onReasonKey} className="mt-4 grid gap-3 sm:grid-cols-2">
                {REASONS.map(({ reason: choice, title, detail, icon: Icon, tile }, index) => {
                  const isOn = reason === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      role="radio"
                      aria-checked={isOn}
                      tabIndex={isOn || (!reason && index === 0) ? 0 : -1}
                      autoFocus={isOn || (!reason && index === 0)}
                      onClick={() => pickReason(choice)}
                      className={cn(
                        "group relative flex flex-col items-start gap-4 rounded-2xl bg-secondary p-5 text-left shadow-md shadow-tertiary/8 ring-1 transition-all duration-200 motion-reduce:transition-none",
                        isOn
                          ? "-translate-y-0.5 shadow-lg shadow-primary/15 ring-2 ring-primary"
                          : "ring-tertiary/8 hover:-translate-y-0.5 hover:shadow-lg",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute right-4 top-4 grid size-5 place-items-center rounded-full border-2 transition-colors",
                          isOn ? "border-primary bg-primary" : "border-tertiary/20",
                        )}
                      >
                        {isOn && <span className="size-2 rounded-full bg-secondary" />}
                      </span>
                      <span className={cn("grid size-11 place-items-center rounded-xl shadow-md", tile)}>
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <span>
                        <span className="block pr-6 text-sm font-semibold text-tertiary">{title}</span>
                        <span className="mt-1 block text-sm text-tertiary/60">{detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {fieldError(fieldErrors.reason)}
            </fieldset>
          )}

          {step === 2 && (
            <>
              <h3 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-tertiary outline-none">
                From when to when?
              </h3>

              <section aria-label="From" className={PANEL}>
                <p className="flex items-center gap-2 text-sm font-semibold text-tertiary">
                  <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Clock aria-hidden="true" className="size-4" />
                  </span>
                  From
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <DateField
                    label="Date"
                    value={from.date}
                    min={today}
                    max={lastDay}
                    onChange={(date) => setMoment("from", { date })}
                    required
                  />
                  <SelectField
                    label="Time"
                    value={String(from.minutes)}
                    options={timeOptions("from", from.date === today ? earliest.minutes : 0)}
                    onChange={(value) => setMoment("from", { minutes: Number(value) })}
                    required
                  />
                </div>
                {from.date && <p className="mt-2 text-xs text-tertiary/55">{hoursLabel(hours, from.date)}</p>}
                {fieldError(fieldErrors.from)}
              </section>

              <section aria-label="Until" className={PANEL}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-tertiary">
                    <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                      <CalendarCheck2 aria-hidden="true" className="size-4" />
                    </span>
                    Until
                  </p>
                  {reason === "out-of-service" && (
                    <div role="radiogroup" aria-label="How it ends" className="flex rounded-full bg-tertiary/5 p-1">
                      {[
                        { open: false, label: "Pick an end" },
                        { open: true, label: "Until it's turned back on" },
                      ].map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          role="radio"
                          aria-checked={isOpenEnded === option.open}
                          onClick={() => {
                            setIsOpenEnded(option.open);
                            setFieldErrors((current) => ({ ...current, until: undefined }));
                          }}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                            isOpenEnded === option.open ? "bg-secondary text-tertiary shadow-sm" : "text-tertiary/60 hover:text-tertiary",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {endsOpen ? (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-tertiary/4 px-3.5 py-3 text-sm text-tertiary/70">
                    <Power aria-hidden="true" className="size-4 shrink-0 text-tertiary/50" />
                    It stays out until someone brings it back from the Seats page.
                  </p>
                ) : (
                  <>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <DateField
                        label="Date"
                        value={until.date}
                        min={from.date || today}
                        max={lastDay}
                        onChange={(date) => setMoment("until", { date })}
                        required
                      />
                      <SelectField
                        label="Time"
                        value={String(until.minutes)}
                        options={timeOptions("until")}
                        onChange={(value) => setMoment("until", { minutes: Number(value) })}
                        required
                      />
                    </div>
                    {until.date && <p className="mt-2 text-xs text-tertiary/55">{hoursLabel(hours, until.date)}</p>}
                  </>
                )}
                {fieldError(fieldErrors.until)}
              </section>

              {reason === "taken" && (
                <p className="text-xs text-tertiary/60">
                  Only opening hours count, and closed days are skipped. Times run on the half hour, up to 60 days ahead.
                </p>
              )}
            </>
          )}

          {step === 3 && preview && (
            <>
              <h3 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-tertiary outline-none">
                Check and confirm
              </h3>

              <section className="relative overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-lg shadow-tertiary/20">
                <div aria-hidden="true" className="cta-banner absolute -bottom-16 -left-10 size-40 rounded-full opacity-25 blur-3xl" />
                <div className="relative flex items-start gap-3.5">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl shadow-md", reason === "taken" ? "cta-gradient" : "bg-secondary/15")}>
                    {reason === "taken" ? <Store aria-hidden="true" className="size-5" /> : <Wrench aria-hidden="true" className="size-5" />}
                  </span>
                  <p className="text-base font-semibold leading-relaxed">{summarySentence(preview.summary)}</p>
                </div>
                {preview.summary.windows.length > 0 && (
                  <div className="relative mt-4">
                    <p className="text-xs text-secondary/65">Held during opening hours on</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {preview.summary.windows.map((window) => (
                        <li key={window.date} className="rounded-full bg-secondary/12 px-2.5 py-1 text-xs text-secondary/90">
                          {isoDayLabel(window.date)}, {clockLabel(window.start)} to {clockLabel(window.end)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {preview.summary.replaces && (
                  <p className="relative mt-4 text-xs text-secondary/70">
                    This replaces its outage from {indiaMomentLabel(Date.parse(preview.summary.replaces.startsAt))}
                    {preview.summary.replaces.endsAt
                      ? ` to ${indiaMomentLabel(Date.parse(preview.summary.replaces.endsAt))}`
                      : " that had no end"}
                    .
                  </p>
                )}
              </section>

              {conflicts.length ? (
                <section aria-label="Using this seat then" className="rounded-2xl bg-primary/6 p-4 ring-1 ring-primary/15 sm:p-5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <TriangleAlert aria-hidden="true" className="size-4" />
                    {conflicts.length === 1 ? "1 person uses this seat then" : `${conflicts.length} people use this seat then`}
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {conflicts.map((conflict, index) => (
                      <ConflictRow key={`${conflict.kind}-${conflict.ref}-${conflict.date}-${index}`} conflict={conflict} />
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-tertiary/75">
                    {hasPeople && "Move them to another seat from Bookings or Members first."}
                    {hasPeople && hasWalkIn && " "}
                    {hasWalkIn && "Mark the walk-in as free first."}
                  </p>
                </section>
              ) : (
                <p className="flex items-center gap-2.5 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-900">
                  <CalendarCheck2 aria-hidden="true" className="size-4 shrink-0" />
                  Nobody else has this seat in that time.
                </p>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-tertiary/10 bg-secondary px-6 py-4">
          {error && (
            <p role="alert" className="mb-3 rounded-lg bg-primary/8 px-3 py-2 text-sm text-primary">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {step > 1 ? (
              <button type="button" onClick={back} disabled={isBusy} className={QUIET_LINK}>
                Back
              </button>
            ) : (
              <button type="button" onClick={onClose} className={QUIET_LINK}>
                Cancel
              </button>
            )}
            {step === 1 && (
              <button type="button" onClick={goToWhen} className={PRIMARY}>
                Next
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            )}
            {step === 2 && (
              <button type="button" onClick={() => void check()} disabled={isBusy} className={PRIMARY}>
                {isBusy ? "Checking..." : "Next"}
                {!isBusy && <ArrowRight aria-hidden="true" className="size-4" />}
              </button>
            )}
            {step === 3 && (
              <button type="button" onClick={() => void confirm()} disabled={isBusy || conflicts.length > 0} className={PRIMARY}>
                <Check aria-hidden="true" className="size-4" />
                {isBusy ? "Saving..." : "Confirm"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatUnavailableModal;
