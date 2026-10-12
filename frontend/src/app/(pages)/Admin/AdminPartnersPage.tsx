"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { canAccessSection } from "@/config/adminPermissions";
import { usePartnerAccounts } from "@/hooks/usePartnerAccounts";
import { useAdminSession } from "@/stores/admin";
import {
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import FormModal from "./components/FormModal";
import InvitePartnerCard from "./components/partners/InvitePartnerCard";
import PartnerAccountCard from "./components/partners/PartnerAccountCard";
import VenuePicker from "./components/VenuePicker";

const AdminPartnersPage = () => {
  const [venue, setVenue] = useState("");
  const { accounts, venues, error, isLoading, invite, update } = usePartnerAccounts(venue);
  const { account: me } = useAdminSession();
  const canEditDetails = me ? canAccessSection(me, "users.manage") : false;
  const [isAdding, setIsAdding] = useState(false);

  return (
    <>
      <PageHeader
        title="Partner accounts"
        description="Logins for venue teams. Each venue admin manages one venue: check-ins, requests and add-on prices."
        actions={
          <button
            type="button"
            onClick={() => setIsAdding(true)}
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
            <h2 id="partners-heading" className="text-base font-bold text-tertiary">
              Venue admins
            </h2>
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
              No venue admins yet{venue ? " for this venue" : ""}.
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

      {isAdding && (
        <FormModal label="Invite a venue admin" onClose={() => setIsAdding(false)}>
          <InvitePartnerCard
            onInvite={async (input) => {
              await invite(input);
              setIsAdding(false);
            }}
          />
        </FormModal>
      )}
    </>
  );
};

export default AdminPartnersPage;
