/** Timed passes start on this grid, counted from the venue's opening time. */
export const SLOT_MINUTES = 30;

/** A payment-page hold never runs past this, however long the page stays open. */
export const HOLD_CAP_MS = 5 * 60_000;

/** How far ahead a pass can be sold. */
export const PASS_HORIZON_DAYS = 60;

// Two days past the pass horizon, so a missed daily job still leaves no gap.
export const MEMBERSHIP_RESERVE_AHEAD_DAYS = PASS_HORIZON_DAYS + 2;
