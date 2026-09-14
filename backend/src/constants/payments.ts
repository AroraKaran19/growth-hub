/** Razorpay rejects anything under one rupee. */
export const MIN_AMOUNT_PAISE = 100;

/** A guard against a runaway client, not a business rule. */
export const MAX_AMOUNT_PAISE = 100_000_000;
