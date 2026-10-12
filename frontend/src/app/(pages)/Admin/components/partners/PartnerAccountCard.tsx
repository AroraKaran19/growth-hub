"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import type { PartnerAccountRow, PartnerChange, VenueOption } from "@/hooks/usePartnerAccounts";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { cn } from "@/utils";
import { timeAgo } from "@/utils/date";
import EditAccountModal from "../EditAccountModal";

type Mode = "view" | "edit" | "confirm-disable";

type PartnerAccountCardProps = {
  account: PartnerAccountRow;
  venues: VenueOption[];
  /** Name, email and password need the Manage users page. */
  canEditDetails: boolean;
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

const PartnerAccountCard = ({ account, venues, canEditDetails, onUpdate }: PartnerAccountCardProps) => {
  const [mode, setMode] = useState<Mode>("view");
  const [isSaving, setIsSaving] = useState(false);
  const isDisabled = account.status === "disabled";

  const setStatus = async (status: "active" | "disabled") => {
    setIsSaving(true);
    try {
      await onUpdate({ status });
      setMode("view");
      toastDone(status === "disabled" ? `${account.name} is disabled and signed out.` : `${account.name} can sign in again.`);
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      setIsSaving(false);
    }
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

      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-tertiary/5 px-3 py-1 text-xs font-medium text-tertiary/75">
        <MapPin aria-hidden="true" className="size-3.5" />
        {account.venueName ?? "Venue no longer listed"}
      </p>

      {mode === "confirm-disable" && (
        <div role="alert" className="mt-4 rounded-xl bg-primary/5 p-3.5 text-sm text-tertiary">
          Disable {account.name}? They are signed out straight away.
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setStatus("disabled")}
              className={cn(QUIET, "text-primary")}
            >
              {isSaving ? "Disabling..." : "Yes, disable"}
            </button>
            <button type="button" onClick={() => setMode("view")} className={cn(QUIET, "text-tertiary/60")}>
              Keep active
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-tertiary/8 pt-3.5">
        <p className="text-xs text-tertiary/50">
          {account.lastActiveAt ? `Active ${timeAgo(account.lastActiveAt)}` : "No recent activity"}
        </p>
        {mode !== "confirm-disable" && (
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setMode("edit")} className={cn(QUIET, "text-tertiary")}>
              {canEditDetails ? "Edit details" : "Move venue"}
            </button>
            {isDisabled ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setStatus("active")}
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

      {mode === "edit" && (
        <EditAccountModal
          portal="partner"
          account={account}
          canEditDetails={canEditDetails}
          venue={{ slug: account.venueSlug, options: venues }}
          onSave={onUpdate}
          onClose={() => setMode("view")}
        />
      )}
    </article>
  );
};

export default PartnerAccountCard;
