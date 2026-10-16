"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { CalendarRange, Clock, Minus, Plus, Power, Timer, Wrench, type LucideIcon } from "lucide-react";
import DateField from "@/app/components/ui/form/DateField";
import { readApiError } from "@/libs/api/errors";
import type { ApiSeat, OutageDuration, SeatOutage } from "@/types/catalogue";
import { SEAT_TYPE_LABELS } from "@/types/seat";
import { cn } from "@/utils";
import {
  indiaDate,
  indiaMomentLabel,
  isoDayLabel,
  OUTAGE_MAX_DAYS,
  OUTAGE_MAX_HOURS,
  outageEndLabel,
} from "@/utils/outages";
import FormModal from "../FormModal";
import { QUIET } from "../venue/fields";

type Kind = OutageDuration["kind"];

const CHOICES: { kind: Kind; label: string; icon: LucideIcon }[] = [
  { kind: "hours", label: "For some hours", icon: Timer },
  { kind: "days", label: "For some days", icon: CalendarRange },
  { kind: "open", label: "Until I turn it back on", icon: Power },
];

const HOUR_MS = 60 * 60_000;

const STEP =
  "flex size-9 items-center justify-center rounded-full bg-secondary text-tertiary shadow-md shadow-tertiary/10 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40 motion-reduce:transition-none";

const PRIMARY =
  "cta-gradient rounded-lg px-5 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-60 motion-reduce:transition-none";

type OutageDialogProps = {
  seat: ApiSeat;
  /** The seat's running outage, if it is out right now. */
  outage: SeatOutage | null;
  now: number;
  onTakeOut: (duration: OutageDuration) => Promise<unknown>;
  onEnd: () => Promise<unknown>;
  onClose: () => void;
};

const Heading = ({ seat, title }: { seat: ApiSeat; title: string }) => (
  <div className="flex items-start gap-3.5 pr-10">
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary shadow-sm">
      <Wrench aria-hidden="true" className="size-5" />
    </span>
    <div className="min-w-0">
      <h2 className="text-lg font-bold text-tertiary">{title}</h2>
      <p className="mt-0.5 text-sm text-tertiary/60">
        {SEAT_TYPE_LABELS[seat.type]}
        {seat.capacity ? `, seats ${seat.capacity}` : ""}
      </p>
    </div>
  </div>
);

/** Takes one seat out of service for a while, or brings it back. */
const OutageDialog = ({ seat, outage: openedWith, now, onTakeOut, onEnd, onClose }: OutageDialogProps) => {
  // Fixed on open, so the saved change doesn't swap the view just before closing.
  const [outage] = useState(openedWith);
  const [kind, setKind] = useState<Kind>("hours");
  const [hours, setHours] = useState(2);
  const [until, setUntil] = useState(() => indiaDate(1, now));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const lengthId = useId();

  const firstDay = indiaDate(0, now);
  const lastDay = indiaDate(OUTAGE_MAX_DAYS, now);

  const run = async (action: () => Promise<unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (caught) {
      setError(readApiError(caught).message);
      setIsSaving(false);
    }
  };

  const submit = () => {
    if (kind === "days" && (!until || until < firstDay || until > lastDay)) {
      setError(`Pick a day from today up to ${OUTAGE_MAX_DAYS} days ahead.`);
      return;
    }
    const duration: OutageDuration =
      kind === "hours" ? { kind, hours } : kind === "days" ? { kind, until } : { kind };
    void run(() => onTakeOut(duration));
  };

  const pick = (next: Kind) => {
    setKind(next);
    setError(null);
  };

  // Arrow keys move through the choices, as in a radio group.
  const onChoiceKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = (CHOICES.findIndex((choice) => choice.kind === kind) + step + CHOICES.length) % CHOICES.length;
    pick(CHOICES[index].kind);
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='radio']")[index]?.focus();
  };

  const footer = (action: string, onAction: () => void, focusAction = false) => (
    <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" onClick={onClose} className={cn(QUIET, "py-2 text-tertiary/70")}>
        Cancel
      </button>
      <button type="button" autoFocus={focusAction} disabled={isSaving} onClick={onAction} className={PRIMARY}>
        {isSaving ? "Saving…" : action}
      </button>
    </div>
  );

  const errorLine = error && (
    <p role="alert" className="mt-4 rounded-xl bg-primary/6 px-3.5 py-2.5 text-sm text-primary">
      {error}
    </p>
  );

  if (outage) {
    return (
      <FormModal label={`${seat.label} is out of service`} onClose={onClose}>
        <div className="bg-secondary p-5 sm:p-6">
          <Heading seat={seat} title={`${seat.label} is out of service`} />
          <div className="mt-5 flex items-start gap-3 rounded-xl bg-tertiary/4 p-4 ring-1 ring-tertiary/6">
            <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tertiary/55" />
            <div>
              <p className="text-sm font-semibold text-tertiary">{outageEndLabel(outage.endsAt)}</p>
              <p className="mt-0.5 text-xs text-tertiary/55">Since {indiaMomentLabel(Date.parse(outage.startsAt))}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-tertiary/60">Members can book it again as soon as it is back.</p>
          {errorLine}
          {footer("Back in service now", () => void run(onEnd), true)}
        </div>
      </FormModal>
    );
  }

  return (
    <FormModal label={`Take ${seat.label} out of service`} onClose={onClose}>
      <div className="bg-secondary p-5 sm:p-6">
        <Heading seat={seat} title={`Take ${seat.label} out of service`} />

        <p id={lengthId} className="mt-6 text-sm font-medium text-tertiary">
          How long?
        </p>
        <div role="radiogroup" aria-labelledby={lengthId} onKeyDown={onChoiceKey} className="mt-2.5 flex flex-wrap gap-2">
          {CHOICES.map(({ kind: choice, label, icon: Icon }) => {
            const isOn = kind === choice;
            return (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={isOn}
                tabIndex={isOn ? 0 : -1}
                autoFocus={isOn}
                onClick={() => pick(choice)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-all motion-reduce:transition-none",
                  isOn
                    ? "border-primary/40 bg-primary/8 font-medium text-primary shadow-sm"
                    : "border-tertiary/15 text-tertiary/75 hover:-translate-y-0.5 hover:border-tertiary/30",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </button>
            );
          })}
        </div>

        <div
          key={kind}
          className="mt-4 animate-[fade-up_0.2s_ease-out_both] rounded-xl bg-tertiary/4 p-4 ring-1 ring-tertiary/6 motion-reduce:animate-none"
        >
          {kind === "hours" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 rounded-full bg-secondary p-1 shadow-sm ring-1 ring-tertiary/8">
                <button type="button" aria-label="Fewer hours" disabled={hours <= 1} onClick={() => setHours(hours - 1)} className={STEP}>
                  <Minus aria-hidden="true" className="size-4" />
                </button>
                <span aria-live="polite" className="min-w-20 text-center text-sm font-semibold text-tertiary">
                  {hours} {hours === 1 ? "hour" : "hours"}
                </span>
                <button
                  type="button"
                  aria-label="More hours"
                  disabled={hours >= OUTAGE_MAX_HOURS}
                  onClick={() => setHours(hours + 1)}
                  className={STEP}
                >
                  <Plus aria-hidden="true" className="size-4" />
                </button>
              </div>
              <p className="text-sm text-tertiary/65">Back at {indiaMomentLabel(now + hours * HOUR_MS)}</p>
            </div>
          )}
          {kind === "days" && (
            <div>
              <DateField
                label="Last day out"
                value={until}
                min={firstDay}
                max={lastDay}
                onChange={(value) => {
                  setUntil(value);
                  setError(null);
                }}
                required
              />
              <p className="mt-2 text-sm text-tertiary/65">
                {until && until >= firstDay && until <= lastDay
                  ? `Out through the end of ${isoDayLabel(until)}.`
                  : `Pick a day up to ${OUTAGE_MAX_DAYS} days ahead.`}
              </p>
            </div>
          )}
          {kind === "open" && (
            <p className="text-sm text-tertiary/70">It stays out until you bring it back from this page.</p>
          )}
        </div>

        {errorLine}
        {footer("Take out of service", submit)}
      </div>
    </FormModal>
  );
};

export default OutageDialog;
