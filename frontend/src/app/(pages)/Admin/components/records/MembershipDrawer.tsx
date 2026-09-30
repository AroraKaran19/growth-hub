"use client";

import { useState } from "react";
import { useAdminMembership } from "@/hooks/useStaffBookings";
import { stopRenewalAsAdmin } from "@/libs/api/adminRecords";
import { readApiError } from "@/libs/api/errors";
import { MEMBERSHIP_LENGTH_LABELS_BY_KEY, MEMBERSHIP_SPACES } from "@/data/membershipPlans";
import { MEMBERSHIP_STATUS_LABELS, isLiveMembership } from "@/types/membership";
import { formatDay } from "@/utils/date";
import { rupees } from "../../../Partner/requestRules";
import AdminCancelForm from "./AdminCancelForm";
import RecordDrawer from "./RecordDrawer";
import RequestHistory from "./RequestHistory";

/** One membership for an admin: details, stop renewal, cancel and every request. */
const MembershipDrawer = ({
  membershipRef,
  onClose,
  onChanged,
}: {
  membershipRef: string;
  onClose: () => void;
  onChanged: () => void;
}) => {
  const { membership, error, mutate } = useAdminMembership(membershipRef);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = async () => {
    await mutate();
    onChanged();
  };

  const stop = async () => {
    setIsStopping(true);
    setActionError(null);
    try {
      await stopRenewalAsAdmin(membershipRef);
      await refresh();
    } catch (caught) {
      setActionError(readApiError(caught).message);
    } finally {
      setIsStopping(false);
    }
  };

  const isLive = membership ? isLiveMembership(membership) : false;

  return (
    <RecordDrawer
      title={membership ? membership.member.name : "Membership"}
      subtitle={<span className="font-mono">{membershipRef}</span>}
      badge={
        membership?.hasOpenRequest ? (
          <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-tertiary">Cancellation requested</span>
        ) : undefined
      }
      onClose={onClose}
    >
      {!membership ? (
        error ? (
          <p className="text-sm text-primary">{readApiError(error).message}</p>
        ) : (
          <div className="h-64 animate-pulse rounded-2xl bg-secondary" />
        )
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl bg-secondary p-5 shadow-sm">
            <div>
              <dt className="text-xs text-tertiary/50">Venue</dt>
              <dd className="mt-1 text-sm font-medium text-tertiary">{membership.venue.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-tertiary/50">Member</dt>
              <dd className="mt-1 text-sm text-tertiary">{membership.member.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-tertiary/50">Plan</dt>
              <dd className="mt-1 text-sm text-tertiary">
                {MEMBERSHIP_LENGTH_LABELS_BY_KEY[membership.length]}, {MEMBERSHIP_SPACES[membership.spaceType].workspace}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-tertiary/50">Seats</dt>
              <dd className="mt-1 text-sm text-tertiary">{membership.seats.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-tertiary/50">Paid through</dt>
              <dd className="mt-1 text-sm text-tertiary">
                {membership.paidThrough ? formatDay(membership.paidThrough) : "Not yet"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-tertiary/50">{membership.renewsOn ? "Renews" : "Status"}</dt>
              <dd className="mt-1 text-sm text-tertiary">
                {membership.renewsOn ? formatDay(membership.renewsOn) : MEMBERSHIP_STATUS_LABELS[membership.status]}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-tertiary/50">Paid in total</dt>
              <dd className="mt-1 text-sm font-semibold text-tertiary">{rupees(membership.paid)}</dd>
            </div>
          </dl>

          {isLive && (
            <section className="flex flex-col gap-4 rounded-2xl border border-tertiary/10 bg-secondary p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-tertiary/70">
                  {membership.renewsOn
                    ? "Stopping keeps the seat until the paid period ends; nothing more is charged."
                    : "This plan ends when its paid period runs out."}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  {membership.renewsOn && (
                    <button
                      type="button"
                      onClick={stop}
                      disabled={isStopping}
                      className="rounded-lg border border-tertiary/20 px-4 py-2 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5 disabled:opacity-60"
                    >
                      {isStopping ? "Stopping..." : "Stop renewal"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCancelOpen((open) => !open)}
                    aria-expanded={isCancelOpen}
                    className="text-sm font-medium text-primary underline underline-offset-4"
                  >
                    Cancel plan
                  </button>
                </div>
              </div>
              {actionError && (
                <p role="alert" className="text-sm text-primary">
                  {actionError}
                </p>
              )}
              {isCancelOpen && (
                <div className="border-t border-tertiary/8 pt-4">
                  <AdminCancelForm
                    kind="membership"
                    recordRef={membership.ref}
                    paid={membership.paid}
                    hasOpenRequest={membership.hasOpenRequest}
                    onDone={async () => {
                      setIsCancelOpen(false);
                      await refresh();
                    }}
                  />
                </div>
              )}
            </section>
          )}

          <section>
            <h3 className="mb-3 text-sm font-semibold text-tertiary">Cancellation requests</h3>
            <RequestHistory requests={membership.requests} />
          </section>
        </div>
      )}
    </RecordDrawer>
  );
};

export default MembershipDrawer;
