"use client";

import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, PencilLine, Sparkles, Trash2 } from "lucide-react";
import { FeatureIcon } from "@/config/featureIcons";
import { useAdminAmenities } from "@/hooks/useAmenities";
import { createAmenity, deleteAmenity, reorderAmenities, updateAmenity } from "@/libs/api/amenitiesAdmin";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import type { Amenity, AmenityInput } from "@/types/amenity";
import { cn } from "@/utils";
import { PartnerPageHeader as PageHeader, PartnerSkeleton as Skeleton } from "../Partner/components/PartnerUi";
import IconPicker from "./components/settings/IconPicker";
import { TextArea, TextInput } from "./components/settings/inputs";
import Toggle from "./components/Toggle";
import { QUIET, RAISED } from "./components/venue/fields";

const EMPTY: AmenityInput = { name: "", icon: "Sparkles", description: "", visible: true };

const toInput = ({ name, icon, description, visible }: Amenity): AmenityInput => ({ name, icon, description, visible });

const AmenityForm = ({ editing, onDone }: { editing: Amenity | null; onDone: () => Promise<unknown> }) => {
  const [draft, setDraft] = useState<AmenityInput>(editing ? toInput(editing) : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (draft.name.trim().length < 2) {
      setErrors({ name: "Enter a name." });
      return;
    }
    setIsSaving(true);
    setErrors({});
    try {
      if (editing) await updateAmenity(editing.id, draft);
      else await createAmenity(draft);
      toastDone(editing ? `${draft.name} saved.` : `${draft.name} added. Venues can now tick it.`);
      setDraft(EMPTY);
      await onDone();
    } catch (caught) {
      const info = readApiError(caught);
      if (Object.keys(info.fields).length) setErrors(info.fields);
      else toastFailed(info.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={cn(RAISED, "h-fit p-5 sm:p-6")}>
      <div className="flex items-center gap-3">
        <span className="cta-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-secondary">
          <FeatureIcon name={draft.icon} className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-tertiary">{editing ? `Edit ${editing.name}` : "Add an amenity"}</h2>
          <p className="text-sm text-tertiary/55">Venues tick it on their listing; the site shows it where offered.</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-4">
        <TextInput id="amenity-name" label="Name" value={draft.name} max={40} error={errors.name} placeholder="Rooftop terrace" onChange={(name) => setDraft({ ...draft, name })} />
        <TextArea id="amenity-description" label="Description (optional)" value={draft.description} max={160} rows={2} error={errors.description} onChange={(description) => setDraft({ ...draft, description })} />
        <IconPicker label="Icon" value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
        <Toggle label="Show on the site" checked={draft.visible} onChange={(visible) => setDraft({ ...draft, visible })} />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <button type="submit" disabled={isSaving} className="cta-gradient grow rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:opacity-60">
          {isSaving ? "Saving..." : editing ? "Save changes" : "Add amenity"}
        </button>
        {editing && (
          <button type="button" onClick={() => void onDone()} className={cn(QUIET, "text-tertiary/60")}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

const AdminAmenitiesPage = () => {
  const { amenities, error, isLoading, mutate } = useAdminAmenities();
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (id: string, action: () => Promise<unknown>, message: string) => {
    setBusyId(id);
    try {
      await action();
      await mutate();
      toastDone(message);
      return true;
    } catch (caught) {
      toastFailed(readApiError(caught).message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const move = (index: number, step: -1 | 1) => {
    const ids = amenities.map((item) => item.id);
    [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
    void run(amenities[index].id, () => reorderAmenities(ids), "Order saved.");
  };

  if (isLoading) return <Skeleton />;

  const shown = amenities.filter((item) => item.visible).length;

  return (
    <>
      <PageHeader
        title="Amenities"
        description="The list venues pick from. Hidden amenities disappear from the site but stay on venues that already have them."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <AmenityForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={async () => {
            setEditing(null);
            await mutate();
          }}
        />

        <section aria-labelledby="amenities-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="amenities-heading" className="text-base font-bold text-tertiary">
              All amenities
            </h2>
            {!error && <p className="text-sm text-tertiary/55">{shown} shown, {amenities.length - shown} hidden</p>}
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-sm text-primary">We couldn&apos;t load amenities. Refresh to try again.</p>
          ) : amenities.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-tertiary/15 p-10 text-center">
              <Sparkles aria-hidden="true" className="mx-auto size-8 text-tertiary/25" />
              <p className="mt-3 text-sm text-tertiary/60">No amenities yet. Add the first one.</p>
            </div>
          ) : (
            <ol className="mt-3 flex flex-col gap-2.5">
              {amenities.map((item, index) => (
                <li key={item.id} className={cn("rounded-2xl border border-tertiary/8 bg-secondary p-4 shadow-md shadow-tertiary/5 transition-shadow hover:shadow-lg", !item.visible && "opacity-60")}>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tertiary text-secondary">
                      <FeatureIcon name={item.icon} className="size-5" />
                    </span>
                    <div className="min-w-0 grow basis-48">
                      <p className="text-sm font-semibold text-tertiary">{item.name}</p>
                      {item.description && <p className="line-clamp-1 text-sm text-tertiary/55">{item.description}</p>}
                    </div>
                    <Toggle
                      label={item.visible ? "Shown" : "Hidden"}
                      checked={item.visible}
                      onChange={(visible) =>
                        void run(item.id, () => updateAmenity(item.id, { ...toInput(item), visible }), visible ? `${item.name} is shown on the site.` : `${item.name} is hidden.`)
                      }
                    />
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label="Move up" disabled={index === 0 || busyId !== null} onClick={() => move(index, -1)} className="rounded-lg p-2 text-tertiary/60 transition-colors hover:bg-tertiary/5 hover:text-tertiary disabled:opacity-30">
                        <ArrowUp aria-hidden="true" className="size-4" />
                      </button>
                      <button type="button" aria-label="Move down" disabled={index === amenities.length - 1 || busyId !== null} onClick={() => move(index, 1)} className="rounded-lg p-2 text-tertiary/60 transition-colors hover:bg-tertiary/5 hover:text-tertiary disabled:opacity-30">
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </button>
                      <button type="button" aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)} className="rounded-lg p-2 text-tertiary/60 transition-colors hover:bg-tertiary/5 hover:text-tertiary">
                        <PencilLine aria-hidden="true" className="size-4" />
                      </button>
                      <button type="button" aria-label={`Delete ${item.name}`} onClick={() => setConfirmDelete(item.id)} className="rounded-lg p-2 text-primary/70 transition-colors hover:bg-primary/5 hover:text-primary">
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </div>
                  {confirmDelete === item.id && (
                    <div role="alert" className="mt-3 flex flex-wrap items-center gap-4 rounded-xl bg-primary/5 p-3 text-sm text-tertiary">
                      Delete {item.name} for good?
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void run(item.id, () => deleteAmenity(item.id), `${item.name} deleted.`).then(() => setConfirmDelete(null))}
                        className={cn(QUIET, "text-primary")}
                      >
                        Yes, delete
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className={cn(QUIET, "text-tertiary/60")}>
                        Keep it
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
};

export default AdminAmenitiesPage;
