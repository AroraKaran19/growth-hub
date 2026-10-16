"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import useSWR, { useSWRConfig } from "swr";
import { Eye, EyeOff, Pencil, RotateCcw } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { useAdminVenues } from "@/hooks/useAdminCatalogue";
import { adminApi } from "@/libs/api/client";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { NO_LABELS, type CatalogueLabels } from "@/types/catalogueLabels";
import type { WorkspaceCategory } from "@/types/category";
import { cn } from "@/utils";
import FormModal from "../FormModal";
import { QUIET, RAISED } from "../venue/fields";
import ImageField from "./ImageField";
import { TextArea, TextInput } from "./inputs";

type Envelope = { data: { data: { labels: CatalogueLabels } } };
type Entry = { kind: "workspace-type"; key: string; label: string; description?: string; image?: string };
type Shown = { label: string; description: string; image: string };

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

const shownFor = (category: WorkspaceCategory, labels: CatalogueLabels): Shown => {
  const details = labels.workspaceTypeDetails[category.slug] ?? {};
  return {
    label: labels.workspaceTypes[category.slug] ?? category.name,
    description: details.description ?? category.description,
    image: details.image ?? category.image,
  };
};

const isCustomised = (category: WorkspaceCategory, labels: CatalogueLabels) => {
  const details = labels.workspaceTypeDetails[category.slug] ?? {};
  return Boolean(labels.workspaceTypes[category.slug] || details.description || details.image);
};

type TypeFormProps = {
  category: WorkspaceCategory;
  saved: Shown;
  isCustom: boolean;
  save: (entry: Entry) => Promise<void>;
  onDone: () => void;
};

const TypeForm = ({ category, saved, isCustom, save, onDone }: TypeFormProps) => {
  const [draft, setDraft] = useState(saved);
  const [errors, setErrors] = useState<Partial<Record<keyof Shown, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const send = async (next: Shown, message: string) => {
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
      toastDone(message);
      onDone();
    } catch (caught) {
      toastFailed(readApiError(caught).message);
      setIsSaving(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found: typeof errors = {};
    if (!draft.label.trim()) found.label = "Enter a name.";
    if (!draft.description.trim()) found.description = "Enter a short description.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    void send(draft, `${draft.label.trim()} saved. It updates everywhere on the site.`);
  };

  return (
    <form onSubmit={submit} noValidate className={cn(RAISED, "p-5 sm:p-6")}>
      <div className="flex items-center gap-3 pr-8">
        <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-tertiary/5">
          {draft.image && <Image src={draft.image} alt="" fill sizes="44px" className="object-cover" />}
        </span>
        <div>
          <h2 className="text-base font-bold text-tertiary">Edit {category.name}</h2>
          <p className="text-sm text-tertiary/55">Updates the home page, search and every venue offering it.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <TextInput
          id={`type-${category.slug}-label`}
          label="Name shown on the site"
          required
          value={draft.label}
          max={40}
          error={errors.label}
          onChange={(label) => setDraft({ ...draft, label })}
        />
        <TextArea
          id={`type-${category.slug}-description`}
          label="Description"
          required
          value={draft.description}
          max={200}
          rows={2}
          error={errors.description}
          onChange={(description) => setDraft({ ...draft, description })}
        />
        <ImageField
          id={`type-${category.slug}-image`}
          label="Image"
          compact
          aspect="aspect-[300/381]"
          value={{ src: draft.image, alt: draft.label }}
          onChange={(image) => setDraft({ ...draft, image: image.src })}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-tertiary/8 pt-4">
        {isCustom ? (
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void send(
                { label: category.name, description: category.description, image: category.image },
                `${category.name} is back to its built-in name, text and image.`,
              )
            }
            className={cn(QUIET, "inline-flex items-center gap-1.5 text-tertiary/60")}
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Reset to built-in
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-medium text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
};

type TypeCardProps = {
  shown: Shown;
  isCustom: boolean;
  /** Live venues offering this type; null when the venue list can't be read. */
  liveCount: number | null;
  index: number;
  onEdit: () => void;
};

const TypeCard = ({ shown, isCustom, liveCount, index, onEdit }: TypeCardProps) => (
  <li
    style={{ animationDelay: `${index * 50}ms` }}
    className="group flex animate-[fade-up_0.35s_ease-out_both] gap-4 rounded-2xl border border-tertiary/8 bg-secondary p-3.5 shadow-md shadow-tertiary/5 transition-all hover:-translate-y-0.5 hover:shadow-lg motion-reduce:animate-none"
  >
    <span className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-tertiary/5">
      {shown.image && <Image src={shown.image} alt="" fill sizes="80px" className="object-cover" />}
    </span>
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-tertiary">{shown.label}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-tertiary/60">{shown.description}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${shown.label}`}
          className="shrink-0 rounded-lg border border-tertiary/12 p-2 text-tertiary/70 transition-colors hover:border-tertiary/30 hover:text-tertiary"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5 text-xs">
        {liveCount !== null &&
          (liveCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/12 px-2.5 py-1 font-medium text-green-700">
              <Eye aria-hidden="true" className="size-3.5" />
              On the home page · {liveCount} live {liveCount === 1 ? "venue" : "venues"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/6 px-2.5 py-1 font-medium text-tertiary/60">
              <EyeOff aria-hidden="true" className="size-3.5" />
              Hidden until a live venue offers it
            </span>
          ))}
        {isCustom && <span className="rounded-full bg-primary/8 px-2.5 py-1 font-medium text-primary">Customised</span>}
      </div>
    </div>
  </li>
);

/** The types are fixed in code; admins change how each is named, described and pictured. */
export const WorkspaceTypesEditor = () => {
  const { labels, error, isLoading, save } = useAdminLabels();
  const { venues, error: venuesError } = useAdminVenues();
  const [editing, setEditing] = useState<WorkspaceCategory | null>(null);

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-tertiary/5" />;
  if (error) return <p role="alert" className="text-sm text-primary">We couldn&apos;t load the workspace types. Refresh to try again.</p>;

  const liveCount = (slug: string) =>
    venuesError ? null : venues.filter((venue) => venue.published && venue.workspaceTypes.includes(slug as never)).length;

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {CATEGORIES.map((category, index) => (
          <TypeCard
            key={category.slug}
            shown={shownFor(category, labels)}
            isCustom={isCustomised(category, labels)}
            liveCount={liveCount(category.slug)}
            index={index}
            onEdit={() => setEditing(category)}
          />
        ))}
      </ul>

      {editing && (
        <FormModal label={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <TypeForm
            category={editing}
            saved={shownFor(editing, labels)}
            isCustom={isCustomised(editing, labels)}
            save={save}
            onDone={() => setEditing(null)}
          />
        </FormModal>
      )}
    </>
  );
};
