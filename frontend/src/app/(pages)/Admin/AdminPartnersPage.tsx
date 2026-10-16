"use client";

import { useState } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import { canAccessSection } from "@/config/adminPermissions";
import { usePartnerAccounts } from "@/hooks/usePartnerAccounts";
import { useAdminSession } from "@/stores/admin";
import { cn } from "@/utils";
import {
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import FormModal from "./components/FormModal";
import InvitePartnerCard from "./components/partners/InvitePartnerCard";
import PartnerAccountCard from "./components/partners/PartnerAccountCard";
import { RAISED } from "./components/venue/fields";
import VenuePicker from "./components/VenuePicker";

type NoFreeVenueProps = { hasVenues: boolean; canEditDetails: boolean; onClose: () => void };

const NoFreeVenue = ({ hasVenues, canEditDetails, onClose }: NoFreeVenueProps) => (
  <div className={cn(RAISED, "p-5 sm:p-6")}>
    <div className="flex items-center gap-3 pr-8">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tertiary text-secondary">
        <KeyRound aria-hidden="true" className="size-5" />
      </span>
      <h2 className="text-base font-bold text-tertiary">{hasVenues ? "Every venue has a login" : "No venues yet"}</h2>
    </div>
    <p className="mt-4 text-sm leading-relaxed text-tertiary/70">
      {!hasVenues
        ? "Add a venue first. Each venue then gets one partner login."
        : canEditDetails
          ? "Each venue has one partner login. To hand a venue to someone else, edit its existing login and change the name, email and password."
          : "Each venue has one partner login. To hand a venue to someone else, ask an admin who manages users to edit its existing login."}
    </p>
    <button
      type="button"
      onClick={onClose}
      className="cta-gradient mt-5 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
    >
      Got it
    </button>
  </div>
);

const AdminPartnersPage = () => {
  const [venue, setVenue] = useState("");
  const { accounts, venues, venuesLoaded, error, isLoading, invite, update } = usePartnerAccounts(venue);
  const { account: me } = useAdminSession();
  const canEditDetails = me ? canAccessSection(me, "users.manage") : false;
  const [adding, setAdding] = useState<"invite" | "no-free-venue" | null>(null);
  const taken = venues.filter((item) => item.hasAccount).length;
  const isFull = venuesLoaded && taken === venues.length;
  const close = () => setAdding(null);

  return (
    <>
      <PageHeader
        title="Partner accounts"
        description="Each venue has one partner login. Its venue admin handles check-ins, requests and add-on prices."
        actions={
          <button
            type="button"
            onClick={() => setAdding(isFull ? "no-free-venue" : "invite")}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:opacity-95"
          >
            <UserPlus aria-hidden="true" className="size-4" />
            Invite venue admin
          </button>
        }
      />

      <div className="mt-6">
        <section aria-labelledby="partners-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id="partners-heading" className="text-base font-bold text-tertiary">
                Venue admins
              </h2>
              {venuesLoaded && venues.length > 0 && (
                <p className="text-sm text-tertiary/55">
                  {taken} of {venues.length} venues have a login
                </p>
              )}
            </div>
            <VenuePicker label="Filter by venue" hideLabel allLabel="All venues" value={venue} onChange={(slug) => setVenue(slug)} className="w-60" />
          </div>

          {isLoading ? (
            <div className="mt-3">
              <Skeleton />
            </div>
          ) : error ? (
            <p role="alert" className="mt-3 text-sm text-primary">
              We couldn&apos;t load partner accounts. Refresh to try again.
            </p>
          ) : accounts.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-tertiary/15 p-6 text-center text-sm text-tertiary/55">
              {venue ? "This venue has no partner login yet." : "No venue admins yet."}
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {accounts.map((account) => (
                <li key={account.id}>
                  <PartnerAccountCard
                    account={account}
                    venues={venues}
                    canEditDetails={canEditDetails}
                    onUpdate={(change) => update(account.id, change)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {adding && (
        <FormModal label={adding === "no-free-venue" ? "No venue without a login" : "Invite a venue admin"} onClose={close}>
          {adding === "no-free-venue" ? (
            <NoFreeVenue hasVenues={venues.length > 0} canEditDetails={canEditDetails} onClose={close} />
          ) : (
            <InvitePartnerCard
              venues={venues}
              onInvite={async (input) => {
                await invite(input);
                close();
              }}
            />
          )}
        </FormModal>
      )}
    </>
  );
};

export default AdminPartnersPage;
