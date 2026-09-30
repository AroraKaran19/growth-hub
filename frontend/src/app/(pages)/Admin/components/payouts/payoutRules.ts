import type { PayoutRow, StatementStatus } from "@/types/payout";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const monthLabel = (month: string) => {
  const [year, index] = month.split("-").map(Number);
  return `${MONTHS[index - 1]} ${year}`;
};

/** This month and the ones before it, newest first, for the month picker. */
export const recentMonths = (today: string, count = 12) => {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, back) => {
    const index = (month - 1 - back + 120) % 12;
    const shiftYear = year - Math.ceil(Math.max(0, back - (month - 1)) / 12);
    const value = `${shiftYear}-${String(index + 1).padStart(2, "0")}`;
    return { value, label: monthLabel(value) };
  });
};

export const previousMonthOf = (today: string) => recentMonths(today, 2)[1].value;

export const STATUS_STYLE: Record<StatementStatus, string> = {
  draft: "bg-amber-500/15 text-amber-800",
  issued: "bg-blue-600/10 text-blue-700",
  paid: "bg-green-500/12 text-green-700",
};

/** What the venue's row says for the month. */
export const rowState = (row: PayoutRow) => {
  if (row.statement) return { label: row.statement.status, total: row.statement.totals.total, items: row.statement.totals.lineCount };
  if (row.pending.count) return { label: "not-generated" as const, total: row.pending.amount, items: row.pending.count };
  return { label: "nothing" as const, total: 0, items: 0 };
};
