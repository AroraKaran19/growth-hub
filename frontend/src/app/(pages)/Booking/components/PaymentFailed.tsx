"use client";

import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";

export type PaymentFailure = {
  code: string;
  title: string;
  detail: string;
  /** False when retrying the same card cannot help. */
  retryable: boolean;
};

type PaymentFailedProps = {
  failure: PaymentFailure;
  onRetry: () => void;
  venueSlug: string;
};

const PaymentFailed = ({ failure, onRetry, venueSlug }: PaymentFailedProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tertiary/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="payment-failed-title"
        className="w-full max-w-md rounded-2xl bg-secondary p-6 text-center sm:p-8"
      >
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
          <AlertCircle aria-hidden="true" className="size-8 text-primary" />
        </span>

        <h2
          id="payment-failed-title"
          className="mt-5 text-2xl font-bold text-tertiary"
        >
          {failure.title}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-tertiary/65">
          {failure.detail}
        </p>

        <p className="mt-4 rounded-lg bg-tertiary/4 px-4 py-2.5 text-xs text-tertiary/55">
          Your seats are still held and you have not been charged. Reference:{" "}
          <span className="font-mono text-tertiary/75">{failure.code}</span>
        </p>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {failure.retryable && (
            <button
              type="button"
              onClick={onRetry}
              className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90 sm:w-auto"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Try again
            </button>
          )}
          <Link
            href={`/workspaces/${venueSlug}/book/seats`}
            className="inline-flex w-full items-center justify-center rounded-lg border border-tertiary/20 px-5 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5 sm:w-auto"
          >
            Change seats
          </Link>
        </div>

        <Link
          href="/support"
          className="mt-5 inline-block text-sm text-tertiary/60 underline underline-offset-4 transition-opacity hover:opacity-70"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
};

export default PaymentFailed;
