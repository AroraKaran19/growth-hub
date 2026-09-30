"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck, TicketPercent } from "lucide-react";
import { useWallet } from "@/hooks/useCoupons";
import { readApiError } from "@/libs/api/errors";
import { cn } from "@/utils";
import { couponHeadline, fitsOrder, type OrderScope } from "@/utils/coupon";
import { rupees } from "../checkoutState";

type CouponPanelProps = {
  scope: OrderScope;
  /** Paise the coupon is worked out on. */
  subtotal: number;
  appliedCode: string | null;
  discount: number;
  /** While paying, the coupon can't change. */
  disabled: boolean;
  onApply: (code: string) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
};

/** Wallet coupons that fit this order, a code field, and the applied saving. */
const CouponPanel = ({ scope, subtotal, appliedCode, discount, disabled, onApply, onRemove }: CouponPanelProps) => {
  const { coupons } = useWallet();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const usable = coupons.filter((coupon) => coupon.state === "available" && fitsOrder(coupon.appliesTo, scope));

  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await action();
      setCode("");
    } catch (caught) {
      setError(readApiError(caught).message);
    } finally {
      setBusy(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return setError("Enter a coupon code.");
    void run("code", () => onApply(code.trim().toUpperCase()));
  };

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-green-600/20 bg-green-500/8 px-3.5 py-3">
        <p className="flex min-w-0 items-center gap-2 text-sm text-green-900">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">
            <span className="font-mono font-semibold">{appliedCode}</span> saves you {rupees(discount)}
          </span>
        </p>
        <button
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void run("remove", onRemove)}
          className="shrink-0 text-xs font-semibold text-green-900 underline underline-offset-4 hover:opacity-75 disabled:opacity-50"
        >
          {busy === "remove" ? "Removing..." : "Remove"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-tertiary/10 bg-surface p-3.5">
      <p className="flex items-center gap-2 text-sm font-medium text-tertiary">
        <TicketPercent aria-hidden="true" className="size-4 text-primary" />
        Have a coupon?
      </p>

      {usable.length > 0 && (
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {usable.map((coupon) => {
            const short = subtotal < coupon.minSpend;
            return (
              <button
                key={coupon.code}
                type="button"
                disabled={disabled || busy !== null || short}
                title={short ? `Spend ${rupees(coupon.minSpend)} or more to use this` : coupon.title}
                onClick={() => void run(coupon.code, () => onApply(coupon.code))}
                className={cn(
                  "flex shrink-0 flex-col items-start rounded-lg border border-dashed px-3 py-2 text-left transition-all",
                  short
                    ? "border-tertiary/15 opacity-55"
                    : "border-primary/40 bg-secondary shadow-sm hover:-translate-y-0.5 hover:shadow-md",
                )}
              >
                <span className="text-sm font-bold text-primary">{couponHeadline(coupon)}</span>
                <span className="font-mono text-xs text-tertiary/65">
                  {busy === coupon.code ? "Applying..." : coupon.code}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <form onSubmit={submit} noValidate className="mt-3 flex gap-2">
        <label htmlFor="checkout-coupon" className="sr-only">
          Coupon code
        </label>
        <input
          id="checkout-coupon"
          autoComplete="off"
          autoCapitalize="characters"
          value={code}
          disabled={disabled}
          onChange={(event) => {
            setCode(event.target.value);
            setError(null);
          }}
          placeholder="Enter a code"
          className="min-w-0 grow rounded-lg border border-tertiary/15 bg-secondary px-3 py-2 font-mono text-sm uppercase text-tertiary outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-tertiary/40 hover:border-tertiary/30 focus-visible:border-primary"
        />
        <button
          type="submit"
          disabled={disabled || busy !== null}
          className="rounded-lg border border-tertiary/20 bg-secondary px-4 py-2 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5 disabled:opacity-50"
        >
          {busy === "code" ? "Applying..." : "Apply"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-xs text-primary">
          {error}
        </p>
      )}
    </div>
  );
};

export default CouponPanel;
