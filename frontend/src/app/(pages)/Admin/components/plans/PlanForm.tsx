"use client";

import { useState, type FormEvent } from "react";
import { ClipboardList, Minus, Plus, X } from "lucide-react";
import { createPlan, updatePlan } from "@/libs/api/membershipPlansAdmin";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import type { MembershipPlan, PlanInput, PlanLength, PlanSpace, PlanVenue, RoomMode } from "@/types/membershipPlan";
import { cn } from "@/utils";
import { TextArea, TextInput } from "../settings/inputs";
import Toggle from "../Toggle";
import { Field, LABEL, QUIET, RAISED, inputClass } from "../venue/fields";
import { LENGTHS, SPACE_LABEL, SPACES, WEEKDAYS } from "./planLabels";

const MAX_INCLUDES = 8;
const MAX_SLOT_HOURS = 8;
const MAX_SEATS = 20;

type Draft = Omit<PlanInput, "prices"> & { prices: Record<PlanLength, string> };

const blank = (venue: PlanVenue): Draft => ({
  name: "",
  description: "",
  includes: [""],
  space: "desk",
  roomMode: null,
  slotHours: null,
  days: [...venue.openDays].sort(),
  prices: { weekly: "", monthly: "", quarterly: "", halfYearly: "" },
  maxSeats: 1,
  visible: true,
});

const fromPlan = (plan: MembershipPlan): Draft => ({
  ...plan,
  includes: plan.includes.length ? plan.includes : [""],
  prices: Object.fromEntries(LENGTHS.map(({ value }) => [value, plan.prices[value]?.toString() ?? ""])) as Record<PlanLength, string>,
});

const openHours = (venue: PlanVenue) => {
  const minutes = (time: string) => {
    const [hours, mins] = time.split(":").map(Number);
    return hours * 60 + mins;
  };
  return venue.opensAt && venue.closesAt ? Math.floor((minutes(venue.closesAt) - minutes(venue.opensAt)) / 60) : 0;
};

type StepperProps = { label: string; value: number; min: number; max: number; noun: string; onChange: (value: number) => void };

const STEP = "flex size-9 items-center justify-center rounded-full bg-secondary text-tertiary shadow-md shadow-tertiary/10 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40";

const Stepper = ({ label, value, min, max, noun, onChange }: StepperProps) => (
  <fieldset>
    <legend className={LABEL}>{label}</legend>
    <div className="flex w-fit items-center gap-3 rounded-full bg-tertiary/5 p-1">
      <button type="button" aria-label={`Fewer ${noun}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={STEP}>
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <span aria-live="polite" className="min-w-16 text-center text-sm font-semibold text-tertiary">
        {value} {noun}
      </span>
      <button type="button" aria-label={`More ${noun}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={STEP}>
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  </fieldset>
);

type PlanFormProps = {
  venue: PlanVenue;
  editing: MembershipPlan | null;
  onDone: () => Promise<unknown>;
};

const PlanForm = ({ venue, editing, onDone }: PlanFormProps) => {
  const [draft, setDraft] = useState<Draft>(editing ? fromPlan(editing) : blank(venue));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const maxSlot = Math.min(MAX_SLOT_HOURS, openHours(venue));
  const isRoom = draft.space === "meeting-room";

  const set = (change: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...change }));
    setErrors({});
  };

  const pickSpace = (space: PlanSpace) =>
    set({ space, roomMode: space === "meeting-room" ? (draft.roomMode ?? "full-day") : null, maxSeats: space === "desk" ? draft.maxSeats : 1 });

  const pickRoomMode = (roomMode: RoomMode) => set({ roomMode, slotHours: roomMode === "time-slot" ? (draft.slotHours ?? Math.min(2, maxSlot || 1)) : null });

  const toggleDay = (day: number) =>
    set({ days: draft.days.includes(day) ? draft.days.filter((item) => item !== day) : [...draft.days, day].sort() });

  const setInclude = (index: number, value: string) => set({ includes: draft.includes.map((line, at) => (at === index ? value : line)) });

  const check = () => {
    const found: Record<string, string> = {};
    if (draft.name.trim().length < 2) found.name = "Enter a name.";
    if (draft.days.length === 0) found.days = "Pick at least one day.";
    const prices = LENGTHS.map(({ value }) => draft.prices[value].trim());
    if (prices.every((price) => !price)) found.prices = "Set a price for at least one length.";
    LENGTHS.forEach(({ value }) => {
      const raw = draft.prices[value].trim();
      if (raw && !(/^\d+$/.test(raw) && Number(raw) > 0)) found[`prices.${value}`] = "Whole rupees above zero.";
    });
    return found;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = check();
    setErrors(found);
    if (Object.keys(found).length) return;

    const input: PlanInput = {
      ...draft,
      includes: draft.includes.map((line) => line.trim()).filter(Boolean),
      prices: Object.fromEntries(LENGTHS.map(({ value }) => [value, draft.prices[value].trim() ? Number(draft.prices[value]) : null])) as PlanInput["prices"],
    };
    setIsSaving(true);
    try {
      if (editing) await updatePlan(editing.id, input);
      else await createPlan(venue.slug, input);
      toastDone(editing ? `${input.name} saved.${editing.inUse ? " Current members keep their price." : ""}` : `${input.name} added to ${venue.name}.`);
      await onDone();
    } catch (caught) {
      const info = readApiError(caught);
      if (Object.keys(info.fields).length) setErrors(info.fields);
      else toastFailed(info.message);
    } finally {
      setIsSaving(false);
    }
  };

  const fieldId = (name: string) => `plan-${name}`;

  return (
    <form onSubmit={submit} noValidate className={cn(RAISED, "h-fit p-5 sm:p-6")}>
      <div className="flex items-center gap-3">
        <span className="cta-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-secondary">
          <ClipboardList aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-tertiary">{editing ? `Edit ${editing.name}` : "Add a plan"}</h2>
          <p className="text-sm text-tertiary/55">Sold at {venue.name} only.</p>
        </div>
      </div>

      {editing?.inUse && (
        <p className="mt-4 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-900">
          Members already have this plan. Changes apply to new purchases; current members keep their price and days.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-5">
        <TextInput id={fieldId("name")} label="Name" value={draft.name} max={60} error={errors.name} placeholder="Dedicated desk" onChange={(name) => set({ name })} />
        <TextArea id={fieldId("description")} label="Description (optional)" value={draft.description} max={240} rows={2} error={errors.description} onChange={(description) => set({ description })} />

        <fieldset>
          <legend className={LABEL}>What it locks</legend>
          <div className="grid grid-cols-2 gap-2">
            {SPACES.map((space) => {
              const selected = space.value === draft.space;
              const Icon = space.icon;
              return (
                <button
                  key={space.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => pickSpace(space.value)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                    selected ? "border-tertiary bg-tertiary font-medium text-secondary shadow-md shadow-tertiary/20" : "border-tertiary/12 text-tertiary/75 hover:-translate-y-0.5 hover:border-tertiary/30",
                  )}
                >
                  <Icon aria-hidden="true" className={cn("size-4 shrink-0", selected && "text-primary")} />
                  {space.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {isRoom && (
          <div className="flex flex-col gap-4 rounded-xl bg-tertiary/4 p-4">
            <fieldset>
              <legend className={LABEL}>Room booking</legend>
              <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 shadow-sm">
                {(["full-day", "time-slot"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={draft.roomMode === mode}
                    onClick={() => pickRoomMode(mode)}
                    className={cn("rounded-full px-3 py-2 text-sm transition-all", draft.roomMode === mode ? "cta-gradient font-medium text-secondary shadow-sm" : "text-tertiary/70 hover:text-tertiary")}
                  >
                    {mode === "full-day" ? "Full day" : "Time slot"}
                  </button>
                ))}
              </div>
              {errors.roomMode && <p className="mt-1.5 text-sm text-primary">{errors.roomMode}</p>}
            </fieldset>
            {draft.roomMode === "time-slot" && (
              <div>
                <Stepper label="Slot length" value={draft.slotHours ?? 1} min={1} max={Math.max(1, maxSlot)} noun="hr" onChange={(slotHours) => set({ slotHours })} />
                <p className="mt-1.5 text-xs text-tertiary/55">The buyer picks the start time; the same window is locked on every covered day. Rooms allow up to {MAX_SLOT_HOURS} hours.</p>
                {errors.slotHours && <p className="mt-1.5 text-sm text-primary">{errors.slotHours}</p>}
              </div>
            )}
          </div>
        )}

        {draft.space === "desk" && (
          <div>
            <Stepper label="Most seats in one purchase" value={draft.maxSeats} min={1} max={MAX_SEATS} noun={draft.maxSeats === 1 ? "seat" : "seats"} onChange={(maxSeats) => set({ maxSeats })} />
            <p className="mt-1.5 text-xs text-tertiary/55">More than one lets a company buy desks for its team in one go.</p>
          </div>
        )}

        <fieldset>
          <legend className={LABEL}>Days it covers</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((label, day) => {
              const isOpen = venue.openDays.includes(day);
              const isOn = draft.days.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={isOn}
                  disabled={!isOpen}
                  title={isOpen ? undefined : "The venue is closed"}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "min-w-12 rounded-full border px-3 py-1.5 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-35",
                    isOn ? "border-primary/40 bg-primary/8 font-medium text-primary shadow-sm" : "border-tertiary/15 text-tertiary/75 enabled:hover:-translate-y-0.5",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {errors.days ? <p className="mt-1.5 text-sm text-primary">{errors.days}</p> : <p className="mt-1.5 text-xs text-tertiary/55">Other days stay free for day passes.</p>}
        </fieldset>

        <fieldset>
          <legend className={LABEL}>Price per {draft.space === "desk" ? "seat" : SPACE_LABEL[draft.space].toLowerCase()}, in rupees</legend>
          <div className="grid grid-cols-2 gap-3">
            {LENGTHS.map((length) => {
              const key = `prices.${length.value}`;
              return (
                <Field key={length.value} id={fieldId(key)} label={length.label} error={errors[key]}>
                  <div className="relative">
                    <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-tertiary/45">
                      ₹
                    </span>
                    <input
                      id={fieldId(key)}
                      inputMode="numeric"
                      value={draft.prices[length.value]}
                      placeholder="Not sold"
                      onChange={(event) => set({ prices: { ...draft.prices, [length.value]: event.target.value } })}
                      className={inputClass(Boolean(errors[key]), "pl-7")}
                    />
                  </div>
                </Field>
              );
            })}
          </div>
          {errors.prices && <p className="mt-1.5 text-sm text-primary">{errors.prices}</p>}
        </fieldset>

        <fieldset>
          <legend className={LABEL}>
            What&apos;s included <span className="font-normal text-tertiary/45">(optional)</span>
          </legend>
          <ul className="flex flex-col gap-2">
            {draft.includes.map((line, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  aria-label={`Included item ${index + 1}`}
                  value={line}
                  maxLength={80}
                  placeholder={index === 0 ? "High-speed Wi-Fi" : "Another perk"}
                  onChange={(event) => setInclude(index, event.target.value)}
                  className={inputClass(Boolean(errors[`includes.${index}`]))}
                />
                {draft.includes.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove item ${index + 1}`}
                    onClick={() => set({ includes: draft.includes.filter((_, at) => at !== index) })}
                    className="rounded-lg p-2 text-tertiary/50 transition-colors hover:bg-tertiary/5 hover:text-tertiary"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {draft.includes.length < MAX_INCLUDES && (
            <button type="button" onClick={() => set({ includes: [...draft.includes, ""] })} className={cn(QUIET, "mt-2 text-primary")}>
              Add a line
            </button>
          )}
          <p className="mt-1.5 text-xs text-tertiary/55">Add-ons stay separate: members buy the venue&apos;s add-ons per day.</p>
        </fieldset>

        <Toggle label="Offer to customers" checked={draft.visible} onChange={(visible) => set({ visible })} />
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button type="submit" disabled={isSaving} className="cta-gradient grow rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:opacity-60">
          {isSaving ? "Saving..." : editing ? "Save plan" : "Add plan"}
        </button>
        {editing && (
          <button type="button" onClick={() => void onDone()} className={cn(QUIET, "text-tertiary/60")}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default PlanForm;
