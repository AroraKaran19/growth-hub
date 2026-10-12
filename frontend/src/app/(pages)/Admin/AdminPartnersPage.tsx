"use client";

import { useState } from "react";
import SelectField from "@/app/components/ui/form/SelectField";
import { canAccessSection } from "@/config/adminPermissions";
import { usePartnerAccounts } from "@/hooks/usePartnerAccounts";
import { useAdminSession } from "@/stores/admin";
import {
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import InvitePartnerCard from "./components/partners/InvitePartnerCard";
import PartnerAccountCard from "./components/partners/PartnerAccountCard";

const AdminPartnersPage = () => {
  const [venue, setVenue] = useState("");
  const { accounts, venues, error, isLoading, invite, update } = usePartnerAccounts(venue);
  const { account: me } = useAdminSession();
  const canEditDetails = me ? canAccessSection(me, "users.manage") : false;

  return (
    <>
      <PageHeader
        title="Partner accounts"
        description="Logins for venue teams. Each venue admin manages one venue: check-ins, requests and add-on prices."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <InvitePartnerCard venues={venues} onInvite={invite} />

        <section aria-labelledby="partners-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="partners-heading" className="text-base font-bold text-tertiary">
              Venue admins
            </h2>
            <SelectField
              label="Filter by venue"
              hideLabel
              value={venue}
              onChange={setVenue}
              options={[
                { value: "", label: "All venues" },
                ...venues.map((item) => ({ value: item.slug, label: item.name })),
              ]}
              className="w-60"
            />
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
            <ul className="mt-3 grid grid-cols-1 gap-4 2xl:grid-cols-2">
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
    </>
  );
};

export default AdminPartnersPage;
