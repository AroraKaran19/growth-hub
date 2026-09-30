import type { Statement } from "@/types/payout";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import { rupees } from "./payoutRules";

const KIND_LABELS = { booking: "Pass", "membership-charge": "Membership", "addon-order": "Add-ons" } as const;

/** The items a statement pays for, with refunds the venue declared shown for reference only. */
const StatementLines = ({ statement }: { statement: Statement }) => {
  const lines = statement.lines ?? [];
  if (!lines.length) {
    return <p className="rounded-xl bg-tertiary/4 px-4 py-6 text-center text-sm text-tertiary/60">No items on this statement.</p>;
  }
  return (
    <ul className="divide-y divide-tertiary/8 overflow-hidden rounded-xl border border-tertiary/10 bg-secondary">
      {lines.map((line) => (
        <li key={`${line.kind}-${line.itemId}`} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-tertiary">{line.description}</p>
            <p className="mt-0.5 text-xs text-tertiary/55">
              {KIND_LABELS[line.kind]} {line.ref}, {line.customerName}, {formatDay(line.date)}
            </p>
            {line.refundDeclared !== null && (
              <p className="mt-1 text-xs text-amber-800">
                Cancelled; the venue declared a refund of {rupees(line.refundDeclared)}
              </p>
            )}
          </div>
          <p className={cn("shrink-0 text-sm font-semibold", line.status === "cancelled" ? "text-tertiary/70" : "text-tertiary")}>
            {rupees(line.amount)}
          </p>
        </li>
      ))}
    </ul>
  );
};

export default StatementLines;
