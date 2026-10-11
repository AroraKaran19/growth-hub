"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { RotateCcw } from "lucide-react";
import { AMENITIES } from "@/data/amenities";
import { CATEGORIES } from "@/data/categories";
import { adminApi } from "@/libs/api/client";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { NO_LABELS, type CatalogueLabels } from "@/types/catalogueLabels";
import type { WorkspaceCategory } from "@/types/category";
import { cn } from "@/utils";
import { QUIET, RAISED, inputClass } from "../venue/fields";
import ImageField from "./ImageField";
import { TextArea, TextInput } from "./inputs";

type Envelope = { data: { data: { labels: CatalogueLabels } } };
type Entry = { kind: "workspace-type" | "amenity"; key: string; label: string; description?: string; image?: string };

const fetchLabels = async () => ((await adminApi.get("/admin/labels")) as Envelope).data.data.labels;

const useAdminLabels = () => {
  const { data, error, isLoading, mutate } = useSWR("admin/labels", fetchLabels);
  const { mutate: mutateGlobal } = useSWRConfig();
  const save = async (entry: Entry) => {
    const labels = ((await adminApi.put("/admin/labels", entry)) as Envelope).data.data.labels;
    await mutate(labels, { revalidate: false });
    await mutateGlobal("catalogue/labels", labels, { revalidate: false });
  };
  return { labels: data ?? NO_LABELS, error, isLoading, save };
};

const TypeCard = ({ category, labels, save }: { category: WorkspaceCategory; labels: CatalogueLabels; save: (entry: Entry) => Promise<void> }) => {
  const details = labels.workspaceTypeDetails[category.slug] ?? {};
  const saved = {
    label: labels.workspaceTypes[category.slug] ?? category.name,
    description: details.description ?? category.description,
    image: details.image ?? category.image,
  };
  const isCustom = Boolean(labels.workspaceTypes[category.slug] || details.description || details.image);
  const [draft, setDraft] = useState(saved);
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const submit = async (next: typeof draft, message: string) => {
    setIsSaving(true);
    try {
      // Built-in values are sent blank, so a later change to the built-in copy still shows.
      await save({
        kind: "workspace-type",
        key: category.slug,
        label: next.label.trim() === category.name ? "" : next.label.trim(),
        description: next.description.trim() === category.description ? "" : next.description.trim(),
        image: next.image === category.image ? "" : next.image,
      });
      setDraft(next);
      toastDone(message);
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      setIsSaving(false);
    }
  };

  const builtIn = { label: category.name, description: category.description, image: category.image };

  return (
    <article className="rounded-xl border border-tertiary/10 bg-secondary p-4 shadow-sm">
      <p className="text-sm font-semibold text-tertiary">
        {category.name}
        <span className="ml-2 font-normal text-tertiary/45">built-in type</span>
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <TextInput id={`type-${category.slug}-label`} label="Name shown on the site" value={draft.label} max={40} onChange={(label) => setDraft({ ...draft, label })} />
        <TextArea
          id={`type-${category.slug}-description`}
          label="Description"
          value={draft.description}
          max={200}
          rows={2}
          onChange={(description) => setDraft({ ...draft, description })}
        />
        <ImageField
          id={`type-${category.slug}-image`}
          label="Image"
          aspect="aspect-[300/381]"
          value={{ src: draft.image, alt: draft.label }}
          onChange={(image) => setDraft({ ...draft, image: image.src })}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-tertiary/8 pt-3.5">
        {isCustom ? (
          <button type="button" disabled={isSaving} onClick={() => void submit(builtIn, `${category.name} is back to its built-in name, text and image.`)} className={cn(QUIET, "inline-flex items-center gap-1.5 text-tertiary/60")}>
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Reset to built-in
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={!isDirty || isSaving || !draft.label.trim() || !draft.description.trim()}
          onClick={() => void submit(draft, `${draft.label.trim()} saved. It updates everywhere on the site.`)}
          className="cta-gradient rounded-lg px-4 py-2 text-sm font-medium text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </article>
  );
};

/** The four types are fixed in code; admins change how each is named, described and pictured. */
export const WorkspaceTypesEditor = () => {
  const { labels, error, isLoading, save } = useAdminLabels();
  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-tertiary/5" />;
  if (error) return <p role="alert" className="text-sm text-primary">We couldn&apos;t load the workspace types. Refresh to try again.</p>;
  return (
    <section className={cn(RAISED, "p-5 sm:p-6")}>
      <h2 className="text-lg font-bold text-tertiary">Workspace types</h2>
      <p className="mt-1 text-sm text-tertiary/60">
        The home page shows a type only when a published venue offers it. Changes apply everywhere the type appears.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {CATEGORIES.map((category) => (
          <TypeCard key={category.slug} category={category} labels={labels} save={save} />
        ))}
      </div>
    </section>
  );
};

const AmenityRow = ({ id, builtIn, current, save }: { id: string; builtIn: string; current?: string; save: (entry: Entry) => Promise<void> }) => {
  const [typed, setTyped] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const value = typed ?? current ?? builtIn;
  const isChanged = value.trim() !== (current ?? builtIn);

  const submit = async (label: string) => {
    setIsSaving(true);
    try {
      await save({ kind: "amenity", key: id, label: label === builtIn ? "" : label });
      setTyped(null);
      toastDone(label ? `${builtIn} now shows as "${label}".` : `${builtIn} is back to its built-in name.`);
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-40 grow basis-60">
        <label htmlFor={`amenity-${id}`} className="sr-only">
          Name for {builtIn}
        </label>
        <input id={`amenity-${id}`} value={value} maxLength={40} onChange={(event) => setTyped(event.target.value)} className={inputClass(false)} />
        <p className="mt-1 text-xs text-tertiary/50">{current ? `Built-in name: ${builtIn}` : "Built-in name"}</p>
      </div>
      <div className="flex items-center gap-3">
        {current && !isChanged && (
          <button type="button" disabled={isSaving} onClick={() => void submit("")} className={cn(QUIET, "inline-flex items-center gap-1 text-xs text-tertiary/60")}>
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Use built-in name
          </button>
        )}
        <button
          type="button"
          disabled={!isChanged || isSaving || !value.trim()}
          onClick={() => void submit(value.trim())}
          className="rounded-lg border border-tertiary/20 px-3.5 py-1.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5 disabled:opacity-40"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </li>
  );
};

export const AmenityLabelsEditor = () => {
  const { labels, error, isLoading, save } = useAdminLabels();
  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-tertiary/5" />;
  if (error) return <p role="alert" className="text-sm text-primary">We couldn&apos;t load the amenities. Refresh to try again.</p>;
  return (
    <section className={cn(RAISED, "p-5 sm:p-6")}>
      <h2 className="text-lg font-bold text-tertiary">Amenity names</h2>
      <p className="mt-1 text-sm text-tertiary/60">
        The list and icons are fixed. The home page shows an amenity only when a published venue offers it.
      </p>
      <ul className="mt-2 grid grid-cols-1 gap-x-8 divide-y divide-tertiary/8 lg:grid-cols-2 lg:divide-y-0">
        {AMENITIES.map((amenity) => (
          <AmenityRow key={amenity.id} id={amenity.id} builtIn={amenity.label} current={labels.amenities[amenity.id]} save={save} />
        ))}
      </ul>
    </section>
  );
};
