import { GST_STATE_CODES } from "@/data/gstStates";

// Mirrors backend/src/utils/gstin.ts: state code, PAN, entity number, Z, check character.
const GSTIN_FORMAT = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const checkCharacter = (body: string) => {
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) {
    const product = CHARS.indexOf(body[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
};

export const tidyGstin = (value: string) => value.replace(/\s+/g, "").toUpperCase();

export const gstinStateCode = (gstin: string) => gstin.slice(0, 2);

export const isValidGstin = (value: string) =>
  GSTIN_FORMAT.test(value) &&
  GST_STATE_CODES.includes(gstinStateCode(value)) &&
  checkCharacter(value.slice(0, 14)) === value[14];
