"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { RotateCcw } from "lucide-react";
import { AMENITIES } from "@/data/amenities";
import { WORKSPACE_TYPE_OPTIONS } from "@/data/searchOptions";
import { adminApi } from "@/libs/api/client";
import { readApiError } from "@/libs/api/errors";
import { toastDone } from "@/libs/toast";
import { NO_LABELS, type CatalogueLabels } from "@/types/catalogueLabels";
import { cn } from "@/utils";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";

type Kind = "workspace-type" | "amenity";
type Envelope = { data: { data: { labels: CatalogueLabels } } };

const fetchLabels = async () => ((await adminApi.get("/admin/labels")) as Envelope).data.data.labels;

const LabelRow = ({
  kind,
  itemKey,
  builtIn,
  current,
  onSaved,
}: {
  kind: Kind;
  itemKey: string;
  builtIn: string;
  current: string | undefined;
  onSaved: (labels: CatalogueLabels) => Promise<unknown>;
}) => {
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const value = typed ?? current ?? builtIn;
  const isChanged = value.trim() !== (current ?? builtIn);

  const save = async (label: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = (await adminApi.put("/admin/labels", { kind, key: itemKey, label: label === builtIn ? "" : label })) as Envelope;
      await onSaved(response.data.data.labels);
      setTyped(null);
      toastDone(label ? `Saved. ${builtIn} now shows as "${label}" within a minute.` : `${builtIn} is back to its built-in name.`);
    } catch (caught) {
      setError(readApiError(caught).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-40 grow basis-60">
        <label htmlFor={`label-${kind}-${itemKey}`} className="sr-only">
          Name for {builtIn}
        </label>
        <input
          id={`label-${kind}-${itemKey}`}
          value={value}
          maxLength={40}
          onChange={(event) => {
            setTyped(event.target.value);
            setError(null);
          }}
          className={cn(
            "w-full rounded-lg border bg-secondary px-3 py-2 text-sm text-tertiary outline-none transition-colors focus-visible:border-primary",
            error ? "border-primary" : "border-tertiary/15 hover:border-tertiary/30",
          )}
        />
        <p className="mt-1 text-xs text-tertiary/50">
          {current ? `Built-in name: ${builtIn}` : "Built-in name"}
          {error && <span className="ml-2 text-primary">{error}</span>}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {current && !isChanged && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void save("")}
            className="inline-flex items-center gap-1 text-xs font-medium text-tertiary/60 hover:text-primary disabled:opacity-50"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Use built-in name
          </button>
        )}
        <button
          type="button"
          disabled={!isChanged || isSaving || !value.trim()}
          onClick={() => void save(value.trim())}
          className="rounded-lg border border-tertiary/20 px-3.5 py-1.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5 disabled:opacity-40"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </li>
  );
};

/** Workspace types and amenities are fixed lists; admins choose the names shown everywhere. */
const AdminLabelsPage = () => {
  const { data, error, isLoading, mutate } = useSWR("admin/labels", fetchLabels);
  const { mutate: mutateGlobal } = useSWRConfig();
  const labels = data ?? NO_LABELS;

  const onSaved = async (next: CatalogueLabels) => {
    await mutate(next, { revalidate: false });
    await mutateGlobal("catalogue/labels", next, { revalidate: false });
  };

  if (isLoading) return <Skeleton />;

  return (
    <>
      <PageHeader
        title="Labels"
        description="Rename the workspace types and amenities shown across the site and admin. The lists themselves are fixed; changes show on the site within a minute."
      />
      {error ? (
        <p role="alert" className={`${CARD} mt-6 px-6 py-14 text-center text-sm text-primary`}>
          We couldn&apos;t load the labels. Refresh to try again.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className={`${CARD} h-fit p-5 shadow-sm`}>
            <h2 className="text-base font-bold text-tertiary">Workspace types</h2>
            <ul className="mt-2 divide-y divide-tertiary/8">
              {WORKSPACE_TYPE_OPTIONS.map((option) => (
                <LabelRow
                  key={option.value}
                  kind="workspace-type"
                  itemKey={option.value}
                  builtIn={option.label}
                  current={labels.workspaceTypes[option.value]}
                  onSaved={onSaved}
                />
              ))}
            </ul>
          </section>
          <section className={`${CARD} h-fit p-5 shadow-sm`}>
            <h2 className="text-base font-bold text-tertiary">Amenities</h2>
            <ul className="mt-2 divide-y divide-tertiary/8">
              {AMENITIES.map((amenity) => (
                <LabelRow
                  key={amenity.id}
                  kind="amenity"
                  itemKey={amenity.id}
                  builtIn={amenity.label}
                  current={labels.amenities[amenity.id]}
                  onSaved={onSaved}
                />
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
};

export default AdminLabelsPage;
