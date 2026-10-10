"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { permissionLabel } from "@/config/adminPermissions";
import type { TeamChange, TeamMember } from "@/hooks/useTeam";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { cn } from "@/utils";
import { timeAgo } from "@/utils/date";
import PermissionPicker from "./PermissionPicker";

type Mode = "view" | "edit" | "confirm-disable";

type TeamMemberCardProps = {
  member: TeamMember;
  isYou: boolean;
  onUpdate: (change: TeamChange) => Promise<void>;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const QUIET = "text-sm font-medium transition-opacity hover:opacity-75 disabled:opacity-50";

const TeamMemberCard = ({ member, isYou, onUpdate }: TeamMemberCardProps) => {
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState<string[]>(member.permissions);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isSuper = member.role === "super-admin";
  const isDisabled = member.status === "disabled";
  const canManage = !isSuper && !isYou;

  const save = async (change: TeamChange) => {
    setIsSaving(true);
    setError(null);
    try {
      await onUpdate(change);
      setMode("view");
      toastDone(
        change.status === "disabled"
          ? `${member.name} is disabled and signed out.`
          : change.status === "active"
            ? `${member.name} can sign in again.`
            : `${member.name}'s access is updated.`,
      );
    } catch (caught) {
      const info = readApiError(caught);
      if (mode === "edit") setError(info.fields.permissions ?? info.message);
      else toastFailed(info.message);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = () => {
    setDraft(member.permissions);
    setError(null);
    setMode("edit");
  };

  const cancel = () => {
    setError(null);
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
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            isSuper ? "cta-gradient text-secondary" : "bg-tertiary text-secondary",
          )}
        >
          {initials(member.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-tertiary">
            {member.name}
            {isYou && (
              <span className="rounded-full bg-tertiary/8 px-2 py-0.5 text-xs font-medium text-tertiary/70">
                You
              </span>
            )}
          </p>
          <p className="truncate text-sm text-tertiary/55">{member.email}</p>
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

      {mode === "edit" ? (
        <div className="mt-4">
          <PermissionPicker
            value={draft}
            onChange={setDraft}
            error={error ?? undefined}
            idPrefix={`edit-${member.id}`}
          />
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              disabled={isSaving || draft.length === 0}
              onClick={() => save({ permissions: draft })}
              className="cta-gradient rounded-lg px-4 py-2 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save access"}
            </button>
            <button type="button" onClick={cancel} className={cn(QUIET, "text-tertiary/60")}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {isSuper ? (
            <span className="badge-gradient inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-secondary">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Full access
            </span>
          ) : member.permissions.length > 0 ? (
            member.permissions.map((key) => (
              <span
                key={key}
                className="rounded-full bg-tertiary/5 px-3 py-1 text-xs font-medium text-tertiary/75"
              >
                {permissionLabel(key)}
              </span>
            ))
          ) : (
            <span className="text-xs text-tertiary/50">No sections yet</span>
          )}
        </div>
      )}

      {mode === "confirm-disable" && (
        <div role="alert" className="mt-4 rounded-xl bg-primary/5 p-3.5 text-sm text-tertiary">
          Disable {member.name}? They are signed out straight away and can&apos;t sign in until
          enabled again.
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
          {member.lastActiveAt ? `Active ${timeAgo(member.lastActiveAt)}` : "No recent activity"}
        </p>
        {canManage && mode === "view" && (
          <div className="flex items-center gap-4">
            {!isDisabled && (
              <button type="button" onClick={startEditing} className={cn(QUIET, "text-tertiary")}>
                Edit access
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

export default TeamMemberCard;
