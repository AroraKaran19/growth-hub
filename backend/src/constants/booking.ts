/** Timed passes start on this grid, counted from the venue's opening time. */
export const SLOT_MINUTES = 30;

/** How far ahead a pass can be sold. */
export const PASS_HORIZON_DAYS = 60;

// Two days past the pass horizon, so a missed daily job still leaves no gap.
export const MEMBERSHIP_RESERVE_AHEAD_DAYS = PASS_HORIZON_DAYS + 2;
