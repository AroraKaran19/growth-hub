"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import useSWR from "swr";
import { useAdminVenue } from "@/hooks/useAdminCatalogue";
import type { AddonPriceInput } from "@/hooks/useVenues";
import { adminApi } from "@/libs/api/client";
import type { AddonChoice } from "@/types/venue";
import { AddonsEditor } from "../Partner/PartnerAddonsPage";
import { useAdminSession } from "@/stores/admin";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import type { AdminVenue } from "@/types/catalogue";
import { cn } from "@/utils";
import { PartnerSkeleton as Skeleton } from "../Partner/components/PartnerUi";
import { canAccessSection } from "@/config/adminPermissions";
import BankDetailsCard from "./components/payouts/BankDetailsCard";
import { QUIET, Section } from "./components/venue/fields";
import DeleteVenueCard from "./components/venue/DeleteVenueCard";
import SeatMapCard from "./components/venue/SeatMapCard";
import VenueForm from "./components/venue/VenueForm";
import {
  draftState,
  errorsFromApi,
  nextBaseVersion,
  toDraft,
  toPayload,
  validateDraft,
  type DraftErrors,
  type VenueDraft,
} from "./components/venue/venueDraft";

const AddonsCard = ({ venue }: { venue: AdminVenue }) => {
  const { data: choices, error, mutate } = useSWR(["admin/venue-addons", venue.slug], async () =>
    ((await adminApi.get(`/admin/venues/${venue.slug}/addons`)) as { data: { data: { choices: AddonChoice[] } } }).data.data.choices,
  );
  const save = async (addons: AddonPriceInput[]) => {
    const response = (await adminApi.put(`/admin/venues/${venue.slug}/addons`, { addons })) as {
      data: { data: { choices: AddonChoice[] } };
    };
    await mutate(response.data.data.choices, { revalidate: false });
  };

  return (
    <Section title="Add-ons" hint="The venue sets these in its partner dashboard. You can set them for it when it needs help.">
      {error ? (
        <p role="alert" className="text-sm text-primary">{readApiError(error).message}</p>
      ) : !choices ? (
        <div className="h-24 animate-pulse rounded-xl bg-tertiary/5" />
      ) : (
        <AddonsEditor choices={choices} onSave={save} onRefresh={() => void mutate()} inCard />
      )}
    </Section>
  );
};

type EditorProps = {
  venue: AdminVenue;
  actions: Pick<ReturnType<typeof useAdminVenue>, "save" | "assignMap" | "unassignMap" | "refresh">;
};

const VenueEditor = ({ venue, actions }: EditorProps) => {
  const { account } = useAdminSession();
  const canManagePayouts = Boolean(account && canAccessSection(account, "payouts"));
  const [draft, setDraft] = useState<VenueDraft>(() => toDraft(venue));
  // The version the draft was loaded at, so someone else's save is never overwritten.
  const [baseVersion, setBaseVersion] = useState(venue.version);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const state = draftState({ baseVersion, venueVersion: venue.version, isDirty });

  const loadLatest = () => {
    setDraft(toDraft(venue));
    setBaseVersion(venue.version);
    setIsDirty(false);
    setErrors({});
  };

  // An untouched form follows the newest copy instead of showing a stale one.
  if (state === "adopt") {
    setDraft(toDraft(venue));
    setBaseVersion(venue.version);
  }

  const handleChange = <K extends keyof VenueDraft>(key: K, value: VenueDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const found = validateDraft(draft, "edit");
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toastFailed("Check the highlighted fields.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await actions.save({ ...toPayload(draft, "edit"), version: baseVersion });
      setDraft(toDraft(updated));
      setBaseVersion(updated.version);
      setIsDirty(false);
      toastDone("Saved. The listing updates across the site within a minute.");
    } catch (caught) {
      const info = readApiError(caught);
      const mapped = errorsFromApi(info);
      setErrors(mapped.errors);
      if (mapped.formError) toastFailed(mapped.formError);
      // A refused publish must not leave the switch claiming the venue is live.
      if (mapped.revertPublished) {
        setDraft((current) => ({ ...current, published: venue.published }));
      }
      if (info.code === "STALE_EDIT") actions.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <VenueForm
      mode="edit"
      draft={draft}
      errors={errors}
      onChange={handleChange}
      onSubmit={handleSubmit}
      isSaving={isSaving}
      status={
        <>
          {state === "conflict" && (
            <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3.5 text-sm text-tertiary">
              This venue was changed somewhere else while you were editing. Your edits are still
              here, but they can&apos;t be saved over the newer version.
              <button type="button" onClick={loadLatest} className={cn(QUIET, "mt-2 block text-primary")}>
                Discard my edits and load the latest
              </button>
            </div>
          )}
        </>
      }
      extra={
        <>
          <SeatMapCard
            venue={venue}
            onAssign={actions.assignMap}
            onUnassign={actions.unassignMap}
            onVersion={(version) => setBaseVersion((current) => nextBaseVersion(current, version))}
          />
          <AddonsCard venue={venue} />
          {canManagePayouts && (
            <Section
              id="bank-details"
              title="Bank details"
              hint="Where this venue's payouts are sent. Statements can't be paid until this is filled in."
            >
              <BankDetailsCard venueSlug={venue.slug} />
            </Section>
          )}
        </>
      }
    />
  );
};

const AdminVenueEditPage = ({ slug }: { slug: string }) => {
  const { venue, error, isLoading, save, assignMap, unassignMap, refresh } = useAdminVenue(slug);
  const notFound = readApiError(error).code === "VENUE_NOT_FOUND";
  const { account } = useAdminSession();

  return (
    <>
      <Link
        href="/admin/venues"
        className="inline-flex items-center gap-2 text-sm text-tertiary/60 transition-colors hover:text-tertiary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All venues
      </Link>

      {isLoading ? (
        <div className="mt-6">
          <Skeleton />
        </div>
      ) : !venue ? (
        <p role="alert" className="mt-6 text-sm text-tertiary/60">
          {notFound ? "Venue not found." : "We couldn't load this venue. Refresh to try again."}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-tertiary">{venue.name}</h1>
              <p className="mt-1 text-sm text-tertiary/60">
                {venue.locality}, {venue.city}
              </p>
            </div>
            <Link
              href={`/workspaces/${venue.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm text-tertiary/65 hover:text-tertiary"
            >
              View listing
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </Link>
          </div>

          <VenueEditor venue={venue} actions={{ save, assignMap, unassignMap, refresh }} />
          {account?.role === "super-admin" && (
            <div className="mt-8">
              <DeleteVenueCard slug={venue.slug} name={venue.name} />
            </div>
          )}
        </>
      )}
    </>
  );
};

export default AdminVenueEditPage;
