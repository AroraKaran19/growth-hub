"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import type { PartnerAccountRow, PartnerChange, VenueOption } from "@/hooks/usePartnerAccounts";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { cn } from "@/utils";
import { timeAgo } from "@/utils/date";

type Mode = "view" | "move" | "confirm-disable";

type PartnerAccountCardProps = {
  account: PartnerAccountRow;
  venues: VenueOption[];
  onUpdate: (change: PartnerChange) => Promise<void>;
};

const QUIET = "text-sm font-medium transition-opacity hover:opacity-75 disabled:opacity-50";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const PartnerAccountCard = ({ account, venues, onUpdate }: PartnerAccountCardProps) => {
  const [mode, setMode] = useState<Mode>("view");
  const [target, setTarget] = useState(account.venueSlug);
  const [isSaving, setIsSaving] = useState(false);
  const isDisabled = account.status === "disabled";

  const save = async (change: PartnerChange) => {
    setIsSaving(true);
    try {
      await onUpdate(change);
      setMode("view");
      const venue = venues.find((option) => option.slug === change.venueSlug);
      toastDone(
        change.status === "disabled"
          ? `${account.name} is disabled and signed out.`
          : change.status === "active"
            ? `${account.name} can sign in again.`
            : `${account.name} now manages ${venue?.name ?? "the new venue"}.`,
      );
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      setIsSaving(false);
    }
  };

  const cancel = () => {
    setTarget(account.venueSlug);
    setMode("view");
  };

  return (
    <article
      className={cn(
        "rounded-2xl border border-tertiary/8 bg-secondary p-5 shadow-lg shadow-tertiary/5 transition-shadow hover:shadow-xl",
        isDisabled && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-tertiary text-sm font-semibold text-secondary"
        >
          {initials(account.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-tertiary">{account.name}</p>
          <p className="truncate text-sm text-tertiary/55">{account.email}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            isDisabled ? "bg-tertiary/8 text-tertiary/60" : "bg-green-500/12 text-green-700",
          )}
        >
          {isDisabled ? "Disabled" : "Active"}
        </span>
      </div>

      {mode === "move" ? (
        <div className="mt-4">
          <SelectField
            label="Move to venue"
            value={target}
            onChange={setTarget}
            options={venues.map((venue) => ({ value: venue.slug, label: venue.name }))}
          />
          <p className="mt-2 text-xs text-tertiary/55">
            They are signed out and sign in again to the new venue.
          </p>
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              disabled={isSaving || target === account.venueSlug}
              onClick={() => save({ venueSlug: target })}
              className="cta-gradient rounded-lg px-4 py-2 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Moving..." : "Move"}
            </button>
            <button type="button" onClick={cancel} className={cn(QUIET, "text-tertiary/60")}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-tertiary/5 px-3 py-1 text-xs font-medium text-tertiary/75">
          <MapPin aria-hidden="true" className="size-3.5" />
          {account.venueName ?? `${account.venueSlug} (not found)`}
        </p>
      )}

      {mode === "confirm-disable" && (
        <div role="alert" className="mt-4 rounded-xl bg-primary/5 p-3.5 text-sm text-tertiary">
          Disable {account.name}? They are signed out straight away.
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => save({ status: "disabled" })}
              className={cn(QUIET, "text-primary")}
            >
              {isSaving ? "Disabling..." : "Yes, disable"}
            </button>
            <button type="button" onClick={cancel} className={cn(QUIET, "text-tertiary/60")}>
              Keep active
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-tertiary/8 pt-3.5">
        <p className="text-xs text-tertiary/50">
          {account.lastActiveAt ? `Active ${timeAgo(account.lastActiveAt)}` : "No recent activity"}
        </p>
        {mode === "view" && (
          <div className="flex items-center gap-4">
            {!isDisabled && (
              <button type="button" onClick={() => setMode("move")} className={cn(QUIET, "text-tertiary")}>
                Move venue
              </button>
            )}
            {isDisabled ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => save({ status: "active" })}
                className={cn(QUIET, "text-green-700")}
              >
                Enable
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("confirm-disable")}
                className={cn(QUIET, "text-primary")}
              >
                Disable
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default PartnerAccountCard;
