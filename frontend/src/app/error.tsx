"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, WifiOff } from "lucide-react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[70vh] items-center bg-surface px-4 pb-16 pt-32">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-tertiary/8 bg-secondary p-8 text-center shadow-lg shadow-tertiary/5">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <WifiOff aria-hidden="true" className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-tertiary">We couldn&apos;t load this page</h1>
        <p className="mt-2 text-sm text-tertiary/60">
          Something went wrong on our side. Your bookings are safe. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="cta-gradient mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
        >
          <RotateCw aria-hidden="true" className="size-4" />
          Try again
        </button>
        <Link
          href="/"
          className="mt-3 block text-sm font-medium text-tertiary/60 transition-colors hover:text-tertiary"
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}
