import crypto from "crypto";

export type RefKind = "booking" | "membership" | "addon-order";

const PREFIX: Record<RefKind, string> = { booking: "GH-", membership: "GH-M-", "addon-order": "GH-A-" };

// The 12-digit forms are references issued before the GH- format.
const PATTERN: Record<RefKind, RegExp> = {
  booking: /^(GH-\d{7}|\d{12})$/,
  membership: /^(GH-M-\d{7}|m-\d{12})$/,
  "addon-order": /^(GH-A-\d{7}|a-\d{12})$/,
};

const ATTEMPTS = 8;

export const isRef = (kind: RefKind, value: unknown): value is string =>
  typeof value === "string" && PATTERN[kind].test(value);

export const canonicalRef = (value: string) => {
  const trimmed = value.trim();
  return /^gh-/i.test(trimmed) ? trimmed.toUpperCase() : trimmed;
};

export const freshRef = async (kind: RefKind, isTaken: (ref: string) => Promise<unknown>) => {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const ref = `${PREFIX[kind]}${String(crypto.randomInt(0, 10_000_000)).padStart(7, "0")}`;
    if (!(await isTaken(ref))) return ref;
  }
  throw new Error(`No free ${kind} reference after ${ATTEMPTS} draws`);
};
