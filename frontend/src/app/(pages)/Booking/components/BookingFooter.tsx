"use client";

import { cn } from "@/utils";

type BookingFooterProps = {
  subtotal: number;
  /** e.g. "₹300/hr x 2" so the total is never a mystery. */
  rateSummary?: string;
  actionLabel: string;
  disabled: boolean;
  onAction: () => void;
  className?: string;
};

const BookingFooter = ({
  subtotal,
  rateSummary,
  actionLabel,
  disabled,
  onAction,
  className,
}: BookingFooterProps) => {
  return (
    // Sticky rather than fixed: a fixed bar would sit over the footer for good.
    <div
      className={cn(
        "sticky bottom-0 z-40 mt-8 border-t border-tertiary/10 bg-secondary",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs text-tertiary/55">Subtotal:</p>
          <p className="text-xl font-bold text-tertiary">
            ₹{Math.round(subtotal)}
          </p>
          {rateSummary && (
            <p className="text-xs text-tertiary/50">{rateSummary}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className="cta-gradient rounded-lg px-8 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

export default BookingFooter;
