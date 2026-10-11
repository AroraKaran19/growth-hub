"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { RotateCcw } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { adminApi } from "@/libs/api/client";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { NO_LABELS, type CatalogueLabels } from "@/types/catalogueLabels";
import type { WorkspaceCategory } from "@/types/category";
import { cn } from "@/utils";
import { QUIET, RAISED } from "../venue/fields";
import ImageField from "./ImageField";
import { TextArea, TextInput } from "./inputs";

type Envelope = { data: { data: { labels: CatalogueLabels } } };
type Entry = { kind: "workspace-type"; key: string; label: string; description?: string; image?: string };

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
      <p className="text-sm text-tertiary/60">The home page shows a type only when a published venue offers it.</p>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {CATEGORIES.map((category) => (
          <TypeCard key={category.slug} category={category} labels={labels} save={save} />
        ))}
      </div>
    </section>
  );
};
