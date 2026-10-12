"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import { useAdminSession } from "@/stores/admin";
import {
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import FormModal from "./components/FormModal";
import InviteAdminCard from "./components/team/InviteAdminCard";
import TeamMemberCard from "./components/team/TeamMemberCard";

const AdminStaffPage = () => {
  const { account } = useAdminSession();
  const { members, error, isLoading, invite, update } = useTeam();
  const [isAdding, setIsAdding] = useState(false);
  const activeCount = members.filter((member) => member.status === "active").length;
  const isSuper = account?.role === "super-admin";
  const grantable = isSuper ? undefined : account?.permissions;

  return (
    <>
      <PageHeader
        title="Staff"
        description={
          isSuper
            ? "Add Growth Hub staff as admins or super admins, edit their details and choose the pages each admin can open."
            : "Add Growth Hub staff as admins, edit their details and choose the pages each one can open."
        }
        actions={
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:opacity-95"
          >
            <UserPlus aria-hidden="true" className="size-4" />
            Add staff
          </button>
        }
      />

      <section aria-labelledby="team-heading" className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="team-heading" className="text-base font-bold text-tertiary">
            People
          </h2>
          {!isLoading && !error && <p className="text-sm text-tertiary/55">{activeCount} active</p>}
        </div>

        {isLoading ? (
          <div className="mt-3">
            <Skeleton />
          </div>
        ) : error ? (
          <p role="alert" className="mt-3 text-sm text-primary">
            We couldn&apos;t load staff. Refresh to try again.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {members.map((member) => (
              <li key={member.id}>
                <TeamMemberCard
                  member={member}
                  isYou={member.id === account?.id}
                  grantable={grantable}
                  viewerIsSuper={isSuper}
                  onUpdate={(change) => update(member.id, change)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdding && (
        <FormModal label="Add staff" onClose={() => setIsAdding(false)}>
          <InviteAdminCard
            grantable={grantable}
            canCreateSuperAdmin={isSuper}
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

export default AdminStaffPage;
