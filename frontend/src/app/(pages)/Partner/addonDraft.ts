import type { AddonPriceInput } from "@/hooks/useVenues";
import type { AddonChoice } from "@/types/venue";

export type AddonRow = { addonTypeId: string; price: string; enabled: boolean };

const MAX_PRICE = 10_000_000;

export const toRows = (choices: AddonChoice[]): AddonRow[] =>
  choices.map((choice) => ({
    addonTypeId: choice.addonTypeId,
    price: choice.price === null ? "" : String(choice.price),
    enabled: choice.enabled,
  }));

export const isDirty = (rows: AddonRow[], choices: AddonChoice[]) =>
  JSON.stringify(rows) !== JSON.stringify(toRows(choices));

/** Errors keyed by add-on type id. Blank and switched off is fine. */
export const validateRows = (rows: AddonRow[]) => {
  const errors: Record<string, string> = {};
  for (const row of rows) {
    const price = Number(row.price);
    if (row.enabled && !(price >= 1)) errors[row.addonTypeId] = "Set a price to offer this add-on.";
    else if (price > MAX_PRICE) errors[row.addonTypeId] = "That amount is too large.";
  }
  return errors;
};

/** Rows with a price; a blank row switched off is simply not sent. */
export const toPayload = (rows: AddonRow[]): AddonPriceInput[] =>
  rows
    .filter((row) => Number(row.price) >= 1)
    .map((row) => ({ addonTypeId: row.addonTypeId, price: Number(row.price), enabled: row.enabled }));

/** Server errors arrive by list position; map them back to their add-on. */
export const errorsFromFields = (fields: Record<string, string>, sent: AddonPriceInput[]) => {
  const errors: Record<string, string> = {};
  for (const [path, message] of Object.entries(fields)) {
    const index = /^addons\.(\d+)\./.exec(path)?.[1];
    const id = index === undefined ? undefined : sent[Number(index)]?.addonTypeId;
    if (id) errors[id] = message;
  }
  return errors;
};
