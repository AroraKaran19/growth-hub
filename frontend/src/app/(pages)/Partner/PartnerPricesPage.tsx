"use client";

import { useState, type FormEvent } from "react";
import { Crown, Ticket } from "lucide-react";
import { usePartnerVenue } from "@/hooks/useVenues";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import {
  MEMBERSHIP_LENGTH_KEYS,
  MEMBERSHIP_LENGTH_LABELS,
  MEMBERSHIP_SPACE_LABELS,
  MEMBERSHIP_SPACES,
  type MembershipLengthKey,
  type MembershipPriceTable,
  type MembershipSpace,
} from "@/types/catalogue";
import type { PartnerVenue } from "@/types/venue";
import { cn } from "@/utils";
import { PARTNER_CARD, PartnerPageHeader, PartnerSkeleton } from "./components/PartnerUi";

const INPUT =
  "w-full rounded-lg border bg-secondary px-3 py-2.5 text-right text-sm text-tertiary outline-none transition-colors placeholder:text-left placeholder:text-tertiary/35 hover:border-tertiary/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const PASSES = [
  { key: "startingPrice", label: "Hourly", unit: "per hour" },
  { key: "halfDayPrice", label: "Half day", unit: "4 hours" },
  { key: "dayPassPrice", label: "Day pass", unit: "full day" },
] as const;

type PassKey = (typeof PASSES)[number]["key"];
type Draft = { passes: Record<PassKey, string>; plans: Record<MembershipSpace, Record<MembershipLengthKey, string>> };

const text = (price: number | null | undefined) => (price === null || price === undefined ? "" : String(price));
const price = (value: string) => (value.trim() === "" ? null : Number(value));

const draftOf = (venue: PartnerVenue): Draft => ({
  passes: {
    startingPrice: text(venue.startingPrice),
    halfDayPrice: text(venue.halfDayPrice),
    dayPassPrice: text(venue.dayPassPrice),
  },
  plans: Object.fromEntries(
    MEMBERSHIP_SPACES.map((space) => [
      space,
      Object.fromEntries(MEMBERSHIP_LENGTH_KEYS.map((length) => [length, text(venue.membershipPrices[space]?.[length])])),
    ]),
  ) as Draft["plans"],
});

/** Spaces that appear on the venue's seat map, so partners only price what they have. */
const spacesOn = (venue: PartnerVenue) => {
  const onMap = new Set(venue.seatMap?.seats.map((seat) => seat.type) ?? []);
  const spaces = MEMBERSHIP_SPACES.filter((space) => onMap.has(space));
  return spaces.length ? spaces : MEMBERSHIP_SPACES;
};

const PricesForm = ({ venue, onSave }: { venue: PartnerVenue; onSave: (draft: Draft) => Promise<void> }) => {
  const [draft, setDraft] = useState(() => draftOf(venue));
  const [isSaving, setIsSaving] = useState(false);
  const spaces = spacesOn(venue);

  const change = (update: (current: Draft) => Draft) => setDraft(update);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const all = [...Object.values(draft.passes), ...spaces.flatMap((space) => Object.values(draft.plans[space]))];
    if (all.some((value) => value.trim() !== "" && !(Number(value) > 0))) {
      toastFailed("Enter prices above ₹0, or leave a box empty if you don't sell that option.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft);
      toastDone("Saved. New prices apply to bookings made from now on.");
    } catch (caught) {
      const info = readApiError(caught);
      toastFailed(Object.values(info.fields)[0] ?? info.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-6">
      <section className={cn(PARTNER_CARD, "p-5 shadow-sm sm:p-6")}>
        <h2 className="flex items-center gap-2 text-base font-bold text-tertiary">
          <Ticket aria-hidden="true" className="size-4 text-primary" />
          Passes
        </h2>
        <p className="mt-1 text-sm text-tertiary/60">Prices per seat, GST included. Leave a box empty if you don&apos;t sell that pass.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PASSES.map((pass) => (
            <label key={pass.key} className="rounded-xl border border-tertiary/10 bg-surface p-4">
              <span className="block text-sm font-semibold text-tertiary">{pass.label}</span>
              <span className="block text-xs text-tertiary/55">{pass.unit}</span>
              <span className="relative mt-3 block">
                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-tertiary/45">
                  ₹
                </span>
                <input
                  inputMode="numeric"
                  placeholder="Not sold"
                  value={draft.passes[pass.key]}
                  onChange={(event) => {
                    const value = event.target.value.replace(/\D/g, "");
                    change((current) => ({ ...current, passes: { ...current.passes, [pass.key]: value } }));
                  }}
                  className={cn(INPUT, "pl-7 border-tertiary/15")}
                />
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className={cn(PARTNER_CARD, "overflow-x-auto p-5 shadow-sm sm:p-6")}>
        <h2 className="flex items-center gap-2 text-base font-bold text-tertiary">
          <Crown aria-hidden="true" className="size-4 text-primary" />
          Memberships
        </h2>
        <p className="mt-1 text-sm text-tertiary/60">
          The price for each plan length, per seat for desks and per room for cabins and offices. Empty means not offered.
        </p>
        <table className="mt-4 w-full min-w-xl text-sm">
          <thead>
            <tr className="text-left text-xs text-tertiary/55">
              <th scope="col" className="pb-2 font-medium">Space</th>
              {MEMBERSHIP_LENGTH_KEYS.map((length) => (
                <th key={length} scope="col" className="pb-2 pl-3 font-medium">
                  {MEMBERSHIP_LENGTH_LABELS[length]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spaces.map((space) => (
              <tr key={space}>
                <th scope="row" className="py-2 pr-3 text-left font-medium text-tertiary">
                  {MEMBERSHIP_SPACE_LABELS[space]}
                </th>
                {MEMBERSHIP_LENGTH_KEYS.map((length) => (
                  <td key={length} className="py-2 pl-3">
                    <label className="sr-only" htmlFor={`plan-${space}-${length}`}>
                      {MEMBERSHIP_SPACE_LABELS[space]}, {MEMBERSHIP_LENGTH_LABELS[length]}
                    </label>
                    <input
                      id={`plan-${space}-${length}`}
                      inputMode="numeric"
                      placeholder="Not offered"
                      value={draft.plans[space][length]}
                      onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, "");
                        change((current) => ({
                          ...current,
                          plans: { ...current.plans, [space]: { ...current.plans[space], [length]: value } },
                        }));
                      }}
                      className={cn(INPUT, "border-tertiary/15")}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="cta-gradient rounded-lg px-6 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save prices"}
        </button>
      </div>
    </form>
  );
};

/** The venue sets its own pass and membership prices; nothing here is worked out for it. */
const PartnerPricesPage = () => {
  const { venue, isLoading, savePrices } = usePartnerVenue();

  if (isLoading || !venue) return <PartnerSkeleton />;

  const save = async (draft: Draft) => {
    const membershipPrices: MembershipPriceTable = {};
    for (const space of spacesOn(venue)) {
      const row = Object.fromEntries(
        MEMBERSHIP_LENGTH_KEYS.flatMap((length) => (draft.plans[space][length].trim() ? [[length, Number(draft.plans[space][length])]] : [])),
      );
      if (Object.keys(row).length) membershipPrices[space] = row;
    }
    await savePrices({
      startingPrice: price(draft.passes.startingPrice),
      halfDayPrice: price(draft.passes.halfDayPrice),
      dayPassPrice: price(draft.passes.dayPassPrice),
      membershipPrices,
    });
  };

  return (
    <>
      <PartnerPageHeader
        title="Prices"
        description="What customers pay for passes and memberships at your venue. Existing bookings and plans keep the price they were bought at."
      />
      <PricesForm key={venue.slug} venue={venue} onSave={save} />
    </>
  );
};

export default PartnerPricesPage;
