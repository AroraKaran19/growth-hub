"use client";

import { useState } from "react";
import { Puzzle } from "lucide-react";
import { usePartnerVenue } from "@/hooks/useVenues";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { ADDON_UNIT_LABELS, type AddonUnit } from "@/types/catalogue";
import type { AddonChoice } from "@/types/venue";
import type { AddonPriceInput } from "@/hooks/useVenues";
import { cn } from "@/utils";
import Toggle from "../Admin/components/Toggle";
import {
  errorsFromFields,
  isDirty,
  toPayload,
  toRows,
  validateRows,
  type AddonRow,
} from "./addonDraft";
import { PartnerPageHeader, PartnerSkeleton } from "./components/PartnerUi";

const UNIT_HINT: Record<AddonUnit, string> = {
  "per-booking": "Charged once for the booking",
  "per-person": "Charged for each person",
  "per-day": "Charged for each day",
};

type Edit = Pick<AddonRow, "price" | "enabled">;

type EditorProps = {
  choices: AddonChoice[];
  onSave: (addons: AddonPriceInput[]) => Promise<unknown>;
  onRefresh: () => void;
};

/** Prices for each add-on Growth Hub offers; used by the venue and by admins on its behalf. */
export const AddonsEditor = ({ choices, onSave, onRefresh }: EditorProps) => {
  // Only edited rows are held, so a refreshed list never shows stale values.
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const rows = toRows(choices).map((row) => ({
    ...row,
    ...edits[row.addonTypeId],
  }));
  const hasChanges = isDirty(rows, choices);
  const offered = rows.filter((row) => row.enabled).length;

  const change = (row: AddonRow, next: Partial<Edit>) => {
    setEdits((current) => ({
      ...current,
      [row.addonTypeId]: { price: row.price, enabled: row.enabled, ...next },
    }));
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([id]) => id !== row.addonTypeId),
      ),
    );
  };

  const handleSave = async () => {
    const found = validateRows(rows);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toastFailed("Fix the highlighted add-ons, then save.");
      return;
    }

    const payload = toPayload(rows);
    setIsSaving(true);
    try {
      await onSave(payload);
      setEdits({});
      toastDone("Saved. Members see these prices within a few minutes.");
    } catch (caught) {
      const info = readApiError(caught);
      setErrors(errorsFromFields(info.fields, payload));
      if (info.code === "ADDON_UNKNOWN") {
        onRefresh();
        toastFailed("Growth Hub has retired one of these add-ons, so the list was refreshed. Check it and save again.");
      } else {
        toastFailed(info.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (choices.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-tertiary/10 bg-secondary px-6 py-14 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-tertiary/5 text-tertiary/60">
          <Puzzle aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-4 text-base font-semibold text-tertiary">
          No add-ons to offer yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
          Growth Hub hasn&apos;t listed any add-ons. They will appear here as
          soon as one is added.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-tertiary px-5 py-4 text-secondary shadow-lg shadow-tertiary/15 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold">
            Members add these while booking a pass
          </p>
          <p className="mt-1 text-sm text-secondary/70">
            Growth Hub decides which add-ons exist. You choose the ones you
            sell and set the price. A membership price never includes them.
          </p>
        </div>
        <p className="rounded-full bg-secondary/10 px-3.5 py-1.5 text-sm font-medium">
          {offered} of {rows.length} offered
        </p>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {rows.map((row, index) => {
          const choice = choices[index];
          const error = errors[row.addonTypeId];
          const inputId = `addon-price-${row.addonTypeId}`;

          return (
            <li
              key={row.addonTypeId}
              className={cn(
                "flex flex-col rounded-2xl border bg-secondary p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                row.enabled ? "border-primary/35" : "border-tertiary/10",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-tertiary">
                  {choice.name}
                </h2>
                <span className="shrink-0 rounded-full bg-tertiary/6 px-2.5 py-1 text-xs font-medium text-tertiary/70">
                  {ADDON_UNIT_LABELS[choice.unit]}
                </span>
              </div>
              <p className="mt-1.5 grow text-sm leading-relaxed text-tertiary/60">
                {choice.description || UNIT_HINT[choice.unit]}
              </p>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-tertiary/8 pt-4">
                <div>
                  <label
                    htmlFor={inputId}
                    className="mb-1.5 block text-xs font-medium text-tertiary/60"
                  >
                    Your price
                  </label>
                  <div
                    className={cn(
                      "flex w-36 items-center rounded-lg border bg-secondary transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
                      error ? "border-primary" : "border-tertiary/20",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="pl-3 text-sm text-tertiary/55"
                    >
                      ₹
                    </span>
                    <input
                      id={inputId}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Whole rupees"
                      value={row.price}
                      onChange={(event) =>
                        change(row, {
                          price: event.target.value.replace(/\D/g, ""),
                        })
                      }
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `${inputId}-error` : undefined}
                      className="w-full min-w-0 bg-transparent px-2 py-2.5 text-sm text-tertiary outline-none placeholder:text-tertiary/35"
                    />
                  </div>
                </div>

                <Toggle
                  checked={row.enabled}
                  onChange={(enabled) => change(row, { enabled })}
                  label="Offered here"
                />
              </div>

              {error && (
                <p
                  id={`${inputId}-error`}
                  role="alert"
                  className="mt-2 text-xs text-primary"
                >
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-tertiary/10 bg-secondary/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-tertiary/60">
            {hasChanges ? "You have unsaved changes." : "Prices are in whole rupees, as members pay them."}
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="cta-gradient rounded-lg px-6 py-2.5 text-sm font-semibold text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSaving ? "Saving..." : "Save add-ons"}
          </button>
        </div>
      </div>
    </>
  );
};

const PartnerAddonsPage = () => {
  const { venue, saveAddons, refresh } = usePartnerVenue();

  return (
    <>
      <PartnerPageHeader
        title="Add-ons"
        description={
          venue
            ? `Extras you sell with passes at ${venue.name}, at your own prices.`
            : "Extras you sell with passes, at your own prices."
        }
      />
      {venue ? (
        <AddonsEditor choices={venue.addonChoices} onSave={saveAddons} onRefresh={refresh} />
      ) : (
        <div className="mt-6">
          <PartnerSkeleton />
        </div>
      )}
    </>
  );
};

export default PartnerAddonsPage;
