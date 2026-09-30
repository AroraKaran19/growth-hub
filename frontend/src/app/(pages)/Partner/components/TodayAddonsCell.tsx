"use client";

import { PackagePlus } from "lucide-react";
import type { TodayAddon } from "@/libs/api/partnerDesk";

const SHOWN = 2;

/** Today's add-ons for one pass or member, and the way to record more. */
const TodayAddonsCell = ({ addons, name, onAdd }: { addons: TodayAddon[]; name: string; onAdd: () => void }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {addons.slice(0, SHOWN).map((addon, index) => (
      <span
        key={`${addon.orderRef}-${index}`}
        className="rounded-full bg-tertiary/6 px-2 py-0.5 text-xs text-tertiary/75"
        title={addon.channel === "desk" ? "Paid at the desk" : "Paid online"}
      >
        {addon.name}
        {addon.quantity > 1 ? ` x ${addon.quantity}` : ""}
      </span>
    ))}
    {addons.length > SHOWN && <span className="text-xs text-tertiary/55">+{addons.length - SHOWN}</span>}
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add-ons for ${name}`}
      className="inline-flex size-7 items-center justify-center rounded-lg border border-tertiary/15 bg-secondary text-tertiary/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
    >
      <PackagePlus aria-hidden="true" className="size-3.5" />
    </button>
  </div>
);

export default TodayAddonsCell;
