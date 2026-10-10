"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, TicketPercent } from "lucide-react";
import { useWallet } from "@/hooks/useCoupons";
import { addToWallet } from "@/libs/api/coupons";
import { readApiError } from "@/libs/api/errors";
import { toastDone } from "@/libs/toast";
import { COUPON_SCOPE_LABELS, type CouponScope, type CouponState, type WalletCoupon } from "@/types/coupon";
import { cn } from "@/utils";
import { couponCap, couponHeadline, minSpendLabel } from "@/utils/coupon";
import { formatDay } from "@/utils/date";

type Tab = "available" | "used" | "expired";

const TABS: { value: Tab; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "used", label: "Used" },
  { value: "expired", label: "Expired" },
];

const TAB_OF: Record<CouponState, Tab> = {
  available: "available",
  upcoming: "available",
  used: "used",
  expired: "expired",
  inactive: "expired",
};

const USE_HREF: Record<CouponScope, string> = {
  any: "/workspaces",
  passes: "/workspaces",
  memberships: "/memberships",
  "meeting-rooms": "/workspaces?type=meeting-room",
};

// A page-coloured disc straddling the card edge at the perforation. Only the
// inner half is painted, so it covers the border and draws the arc.
const NOTCH =
  "absolute left-[102px] size-5 rounded-full border border-tertiary/10 bg-secondary";

type CouponTicketProps = {
  coupon: WalletCoupon;
  state: CouponState;
  isCopied: boolean;
  onCopy: (code: string) => void;
};

const CouponTicket = ({ coupon, state, isCopied, onCopy }: CouponTicketProps) => {
  const isAvailable = state === "available";
  const cap = couponCap(coupon);

  return (
    <article className="relative flex rounded-2xl border border-tertiary/10 bg-secondary">
      <div
        className={cn(
          "flex w-28 shrink-0 flex-col items-center justify-center rounded-l-2xl px-3 py-5 text-center text-secondary",
          isAvailable ? "cta-gradient" : "bg-tertiary/30",
        )}
      >
        <TicketPercent aria-hidden="true" className="size-5" />
        <p className="mt-2 text-lg font-bold leading-tight">
          {couponHeadline(coupon)}
        </p>
        {cap && <p className="mt-1 text-xs text-secondary/85">{cap}</p>}
      </div>

      <span
        aria-hidden="true"
        className={cn(NOTCH, "top-[-11px] [clip-path:inset(50%_0_0_0)]")}
      />
      <span
        aria-hidden="true"
        className={cn(NOTCH, "bottom-[-11px] [clip-path:inset(0_0_50%_0)]")}
      />

      <div className="min-w-0 grow border-l border-dashed border-tertiary/20 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3
            className={cn(
              "text-base font-semibold",
              isAvailable ? "text-tertiary" : "text-tertiary/60",
            )}
          >
            {coupon.title}
          </h3>
          {state === "used" && (
            <span className="rounded-full bg-tertiary/8 px-2.5 py-0.5 text-xs font-medium text-tertiary/70">Used</span>
          )}
          {state === "upcoming" && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              From {formatDay(coupon.startsOn)}
            </span>
          )}
          {(state === "expired" || state === "inactive") && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {state === "expired" ? "Expired" : "Withdrawn"}
            </span>
          )}
          {isAvailable && coupon.usesLeft > 1 && (
            <span className="rounded-full bg-green-500/12 px-2.5 py-0.5 text-xs font-medium text-green-800">
              {coupon.usesLeft} uses left
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-tertiary/60">{coupon.description}</p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tertiary/55">
          <li>{COUPON_SCOPE_LABELS[coupon.appliesTo]}</li>
          <li>{minSpendLabel(coupon.minSpend)}</li>
          <li>
            {state === "expired" ? "Ended" : "Valid till"} {formatDay(coupon.endsOn)}
          </li>
        </ul>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onCopy(coupon.code)}
            disabled={!isAvailable}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-1.5 font-mono text-sm font-semibold transition-colors",
              isAvailable
                ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-tertiary/20 bg-tertiary/4 text-tertiary/45",
            )}
          >
            {coupon.code}
            {isAvailable &&
              (isCopied ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              ))}
            <span className="sr-only">
              {isCopied ? "Copied" : "Copy code"}
            </span>
          </button>

          {isAvailable && (
            <Link
              href={USE_HREF[coupon.appliesTo]}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-75"
            >
              Use now
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

const CouponsPage = () => {
  const { coupons, isLoading, mutate } = useWallet();
  const isHydrated = !isLoading;
  const [tab, setTab] = useState<Tab>("available");
  const [isAdding, setIsAdding] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const withState = coupons.map((coupon) => ({ coupon, state: coupon.state }));

  const counts = Object.fromEntries(
    TABS.map(({ value }) => [value, withState.filter((item) => TAB_OF[item.state] === value).length]),
  ) as Record<Tab, number>;

  const visible = withState.filter((item) => TAB_OF[item.state] === tab);

  const handleCopy = (value: string) => {
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopiedCode(value);
        setTimeout(
          () => setCopiedCode((current) => (current === value ? null : current)),
          2000,
        );
      })
      .catch(() => setCopiedCode(null));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return setError("Enter a coupon code.");
    setIsAdding(true);
    try {
      const coupon = await addToWallet(code);
      await mutate();
      toastDone(`${coupon.code} added to your wallet: ${coupon.title}.`);
      setCode("");
      setTab(TAB_OF[coupon.state]);
    } catch (caught) {
      setError(readApiError(caught).message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tertiary">My Coupons</h1>
          <p className="mt-1 text-sm text-tertiary/60">
            Offers saved to your account. Apply them at checkout, or copy a
            code to share with your team.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-tertiary/10 bg-surface p-4 sm:p-5"
      >
        <label className="min-w-0 grow basis-60">
          <span className="mb-1.5 block text-sm font-medium text-tertiary">
            Have a code?
          </span>
          <input
            type="text"
            name="couponCode"
            autoComplete="off"
            autoCapitalize="characters"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
            placeholder="Enter a coupon code"
            aria-describedby={error ? "redeem-message" : undefined}
            className="w-full rounded-lg border border-tertiary/15 bg-secondary px-3.5 py-2.5 text-sm uppercase text-tertiary outline-none transition-colors placeholder:normal-case placeholder:text-tertiary/40 hover:border-tertiary/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </label>
        <button
          type="submit"
          disabled={isAdding}
          className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isAdding ? "Adding..." : "Add to wallet"}
        </button>
        {error && (
          <p id="redeem-message" role="alert" className="basis-full text-sm text-primary">
            {error}
          </p>
        )}
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-tertiary/10 pt-6">
        <div
          role="tablist"
          aria-label="Coupon status"
          className="flex flex-wrap gap-0.5 rounded-[10px] border border-tertiary/10 bg-tertiary/3 p-0.5"
        >
          {TABS.map(({ value, label }) => {
            const isActive = tab === value;

            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(value)}
                className={cn(
                  "inline-flex h-9.5 min-w-31 items-center justify-center gap-2 rounded-lg px-6 text-sm transition-colors",
                  isActive
                    ? "cta-gradient font-medium text-secondary"
                    : "bg-tertiary/4 text-tertiary hover:bg-tertiary/8",
                )}
              >
                {label}
                {isActive && isHydrated && counts[value] > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-tertiary">
                    {counts[value]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!isHydrated ? (
        <div className="mt-6 h-64 animate-pulse rounded-2xl border border-tertiary/10 bg-surface" />
      ) : visible.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visible.map(({ coupon, state }) => (
            <CouponTicket
              key={coupon.code}
              coupon={coupon}
              state={state}
              isCopied={copiedCode === coupon.code}
              onCopy={handleCopy}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-tertiary/10 px-6 py-16 text-center">
          <p className="text-base font-semibold text-tertiary">
            No {tab} coupons
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
            {tab === "available"
              ? "New offers land here. Add a code above if you have one."
              : "Coupons move here once they are used or run out."}
          </p>
        </div>
      )}
    </>
  );
};

export default CouponsPage;
