"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { HandCoins, Store, X } from "lucide-react";
import { AddonTiles, DayChips, toggled } from "@/app/components/shared/AddonPickers";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { addonDays, addonOrderLines, datesLabel } from "@/app/(pages)/Account/addonOrderRules";
import { rupees } from "@/app/(pages)/Booking/checkoutState";
import { readApiError } from "@/libs/api/errors";
import type { DeskSale, TodayAddon } from "@/libs/api/partnerDesk";
import type { ApiAddonOrder, DeskAddonTarget } from "@/types/addonOrder";
import type { DayHours, VenueAddonOffer } from "@/types/catalogue";
import { cn } from "@/utils";

export type DeskAddonSubject =
  | { kind: "pass"; ref: string; name: string; people: number }
  | { kind: "member"; ref: string; name: string; people: number; paidThrough: string };

type DeskAddonModalProps = {
  subject: DeskAddonSubject;
  offers: VenueAddonOffer[];
  /** The venue's weekly hours; a member's add-ons sell on its open days only. */
  hours: DayHours[];
  today: string;
  /** What this pass or member already has today. */
  existing: TodayAddon[];
  /** This venue's desk sales for them recorded today, which can still be voided. */
  voidable: DeskSale[];
  onRecord: (target: DeskAddonTarget, addonKeys: string[]) => Promise<ApiAddonOrder>;
  onVoid: (orderRef: string) => Promise<void>;
  onClose: () => void;
};

/** Records add-ons the venue has already been paid for; Growth Hub takes no payment here. */
const DeskAddonModal = ({ subject, offers, hours, today, existing, voidable, onRecord, onVoid, onClose }: DeskAddonModalProps) => {
  const isMember = subject.kind === "member";
  const [days] = useState(() => (subject.kind === "member" ? addonDays(hours, today, subject.paidThrough) : [today]));
  const [dates, setDates] = useState<string[]>(() => days.slice(0, 1));
  const [keys, setKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [voiding, setVoiding] = useState<string | null>(null);

  const onEscape = useEffectEvent(onClose);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const lines = addonOrderLines(offers, keys, subject.people, isMember ? dates.length : 1);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  const record = async () => {
    if (!keys.length) return setError("Pick at least one add-on.");
    if (isMember && !dates.length) return setError("Pick at least one day.");
    setIsSaving(true);
    setError(null);
    try {
      await onRecord(isMember ? { membershipRef: subject.ref, dates } : { bookingRef: subject.ref }, keys);
      onClose();
    } catch (caught) {
      setError(readApiError(caught).message);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tertiary/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="desk-addon-title"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-secondary shadow-2xl"
      >
        <div className="relative shrink-0 overflow-hidden bg-tertiary px-6 py-5 text-secondary">
          <div aria-hidden="true" className="cta-banner absolute -right-12 -top-16 size-44 rounded-full opacity-30 blur-3xl" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-1 text-secondary/60 transition-colors hover:text-secondary"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <p className="relative flex items-center gap-2 text-sm text-secondary/70">
            <Store aria-hidden="true" className="size-4" />
            {isMember ? "Membership" : "Pass"} {subject.ref}
          </p>
          <h2 id="desk-addon-title" className="relative mt-1 text-xl font-bold">
            Add-ons for {subject.name}
          </h2>
          <p className="relative mt-1 text-sm text-secondary/70">
            Take payment at the desk first. This records the sale so the team can see it.
          </p>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto p-6">
          {(existing.length > 0 || voidable.length > 0) && (
            <section aria-label="Already added" className="rounded-xl bg-surface p-4">
              {existing.length > 0 && <h3 className="text-sm font-medium text-tertiary">Already on today</h3>}
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {existing.map((line, index) => (
                  <li
                    key={`${line.orderRef}-${index}`}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs shadow-sm",
                      line.channel === "desk" ? "bg-secondary text-tertiary/75" : "bg-green-500/10 text-green-800",
                    )}
                  >
                    {line.name}
                    {line.quantity > 1 ? ` x ${line.quantity}` : ""}
                    <span className="text-tertiary/45"> · {line.channel === "desk" ? "desk" : "online"}</span>
                  </li>
                ))}
              </ul>
              {voidable.length > 0 && (
                <div className={cn("flex flex-col gap-2 text-xs text-tertiary/65", existing.length > 0 && "mt-3 border-t border-tertiary/8 pt-3")}>
                  <span>Recorded by mistake today? Void it before the day ends.</span>
                  {voidable.map((sale) => (
                    <div key={sale.ref} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 shadow-sm">
                      <span className="text-tertiary/80">
                        {sale.items.map((item) => `${item.name}${item.quantity > 1 ? ` x ${item.quantity}` : ""}`).join(", ")}
                        <span className="text-tertiary/50">, {datesLabel(sale.dates)}, {rupees(sale.total)}</span>
                      </span>
                      <button
                        type="button"
                        disabled={voiding !== null}
                        onClick={async () => {
                          setVoiding(sale.ref);
                          await onVoid(sale.ref);
                          setVoiding(null);
                        }}
                        className="font-medium text-tertiary/75 underline underline-offset-4 hover:text-primary disabled:opacity-50"
                      >
                        {voiding === sale.ref ? "Voiding..." : "Void sale"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {isMember && (
            <fieldset aria-required="true">
              <legend className="text-sm font-medium text-tertiary">
                Which days?
                <RequiredMark />
              </legend>
              {days.length ? (
                <DayChips days={days} picked={dates} onToggle={(iso) => setDates(toggled(dates, iso))} />
              ) : (
                <p className="mt-3 rounded-lg bg-tertiary/5 px-3 py-2 text-sm text-tertiary/70">
                  This plan has no paid open days left.
                </p>
              )}
            </fieldset>
          )}

          <fieldset aria-required="true">
            <legend className="text-sm font-medium text-tertiary">
              What did they buy?
              <RequiredMark />
            </legend>
            {offers.length ? (
              <AddonTiles offers={offers} picked={keys} onToggle={(key) => setKeys(toggled(keys, key))} />
            ) : (
              <p className="mt-3 rounded-lg bg-tertiary/5 px-3 py-2 text-sm text-tertiary/70">
                Set add-on prices on the Add-ons page to sell them here.
              </p>
            )}
          </fieldset>
        </div>

        <div className="shrink-0 border-t border-tertiary/10 bg-surface px-6 py-4">
          {error && (
            <p role="alert" className="mb-3 rounded-lg bg-primary/8 px-3 py-2 text-sm text-primary">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-tertiary/55">Collected at the desk</p>
              <p className="text-2xl font-bold text-tertiary">{rupees(total)}</p>
            </div>
            <button
              type="button"
              onClick={record}
              disabled={isSaving || !offers.length}
              className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <HandCoins aria-hidden="true" className="size-4" />
              {isSaving ? "Recording..." : "Paid at the desk"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeskAddonModal;
