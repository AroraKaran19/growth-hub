"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, PencilLine, Plus, Puzzle } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { useAddonTypes, type AddonTypeChange } from "@/hooks/useAdminCatalogue";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { ADDON_UNIT_LABELS, type AddonTypeView, type AddonUnit } from "@/types/catalogue";
import { cn } from "@/utils";
import {
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import { nextSortOrder, reorderChanges } from "./components/addonOrder";
import FormModal from "./components/FormModal";
import { LabelledField } from "./components/settings/inputs";
import { QUIET, RAISED, inputClass } from "./components/venue/fields";
import { slugFromName } from "./components/venue/venueDraft";

const UNIT_OPTIONS = (Object.keys(ADDON_UNIT_LABELS) as AddonUnit[]).map((value) => ({
  value,
  label: ADDON_UNIT_LABELS[value],
}));

const UNIT_HINTS: Record<AddonUnit, string> = {
  "per-booking": "Charged once per booking.",
  "per-person": "Charged for each person on the booking.",
  "per-day": "Charged for each day.",
};

type Errors = Partial<Record<"name" | "key" | "unit", string>>;

type FormProps = {
  editing: AddonTypeView | null;
  nextOrder: number;
  /** False until the list has loaded, so a new type never reuses an order. */
  isReady: boolean;
  onCreate: ReturnType<typeof useAddonTypes>["create"];
  onUpdate: (id: string, change: AddonTypeChange) => Promise<void>;
  onDone: () => void;
  onCancel: () => void;
};

const AddonTypeForm = ({ editing, nextOrder, isReady, onCreate, onUpdate, onDone, onCancel }: FormProps) => {
  const [name, setName] = useState(editing?.name ?? "");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [unit, setUnit] = useState<AddonUnit | "">("");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Errors = {
      ...(name.trim().length < 2 && { name: "Enter a name." }),
      ...(!editing && !/^[a-z0-9][a-z0-9-]{1,62}$/.test(key) && { key: "Use lowercase letters, numbers or hyphens." }),
      ...(!editing && !unit && { unit: "Pick how it is charged." }),
    };
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    try {
      if (editing) {
        await onUpdate(editing.id, { name: name.trim(), description: description.trim() });
      } else if (unit) {
        await onCreate({ key, name: name.trim(), description: description.trim(), unit, sortOrder: nextOrder });
        toastDone(`${name.trim()} is ready. Venues can now price it in their dashboard.`);
      }
      onDone();
    } catch (caught) {
      const info = readApiError(caught);
      if (editing) {
        if (info.fields.name) setErrors({ name: info.fields.name });
        else setFormError(info.message);
      } else if (info.code === "ADDON_KEY_TAKEN") setErrors({ key: "That key is already used." });
      else if (Object.keys(info.fields).length > 0) setErrors({ name: info.fields.name, key: info.fields.key, unit: info.fields.unit });
      else toastFailed(info.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className={cn(RAISED, "p-5 sm:p-6")}>
      <div className="flex items-center gap-3 pr-8">
        <span className="cta-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-secondary">
          <Puzzle aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-tertiary">{editing ? `Edit ${editing.name}` : "New add-on type"}</h2>
          <p className="text-sm text-tertiary/55">Venues choose whether to offer it, and set their price.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <LabelledField id="addon-name" label="Name" required error={errors.name}>
          <input
            id="addon-name"
            aria-required="true"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!editing && !keyEdited) setKey(slugFromName(event.target.value));
            }}
            placeholder="What customers see, such as Locker"
            className={inputClass(Boolean(errors.name))}
          />
        </LabelledField>
        {editing ? (
          <div>
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-tertiary/4 p-3.5">
              <div className="min-w-0">
                <dt className="text-xs text-tertiary/55">Key</dt>
                <dd className="mt-0.5 truncate font-mono text-sm text-tertiary">{editing.key}</dd>
              </div>
              <div>
                <dt className="text-xs text-tertiary/55">How it is charged</dt>
                <dd className="mt-0.5 text-sm text-tertiary">{ADDON_UNIT_LABELS[editing.unit]}</dd>
              </div>
            </dl>
            <p className="mt-1.5 text-sm text-tertiary/55">The key and charge unit can&apos;t be changed once created.</p>
          </div>
        ) : (
          <>
            <LabelledField id="addon-key" label="Key" required error={errors.key}>
              <input
                id="addon-key"
                aria-required="true"
                value={key}
                onChange={(event) => {
                  setKeyEdited(true);
                  setKey(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="A short id, fixed once created"
                className={inputClass(Boolean(errors.key), "font-mono")}
              />
            </LabelledField>
            <div>
              <SelectField
                label="How it is charged"
                required
                value={unit}
                onChange={(value) => setUnit(value as AddonUnit)}
                options={UNIT_OPTIONS}
                placeholder="Pick a unit"
              />
              <p className={cn("mt-1.5 text-sm", errors.unit ? "text-primary" : "text-tertiary/55")}>
                {errors.unit ?? (unit ? UNIT_HINTS[unit] : "This can't be changed later, because venues price in it.")}
              </p>
            </div>
          </>
        )}
        <LabelledField id="addon-description" label="Description" optional>
          <input
            id="addon-description"
            maxLength={200}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="One line shown under the add-on"
            className={inputClass(false)}
          />
        </LabelledField>
      </div>

      {formError && (
        <p role="alert" className="mt-4 text-sm text-primary">
          {formError}
        </p>
      )}

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSaving || (!editing && !isReady)}
          className="cta-gradient grow rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {editing ? (isSaving ? "Saving..." : "Save changes") : isSaving ? "Adding..." : "Add add-on type"}
        </button>
        {editing && (
          <button type="button" onClick={onCancel} className={cn(QUIET, "text-tertiary/60")}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

type RowProps = {
  addon: AddonTypeView;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** True while any row is being moved, so two moves never overlap. */
  isReordering: boolean;
  onMove: (step: -1 | 1) => void;
  onEdit: () => void;
  onUpdate: (id: string, change: AddonTypeChange) => Promise<void>;
};

const AddonRow = ({ addon, canMoveUp, canMoveDown, isReordering, onMove, onEdit, onUpdate }: RowProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const toggleActive = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onUpdate(addon.id, { active: !addon.active });
    } catch (caught) {
      const info = readApiError(caught);
      setError(info.fields.name ?? info.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <li className={cn(RAISED, "flex flex-col p-4 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:p-5", !addon.active && "opacity-70")}>
      <div className="flex grow items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-tertiary">
            {addon.name}
            <span className="rounded-full bg-tertiary/5 px-2.5 py-0.5 text-xs font-medium text-tertiary/70">
              {ADDON_UNIT_LABELS[addon.unit]}
            </span>
            {!addon.active && (
              <span className="rounded-full bg-tertiary/8 px-2.5 py-0.5 text-xs font-medium text-tertiary/60">
                Retired
              </span>
            )}
          </p>
          <p className="mt-0.5 font-mono text-xs text-tertiary/55">{addon.key}</p>
          {addon.description && <p className="mt-1.5 line-clamp-2 text-sm text-tertiary/60">{addon.description}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canMoveUp || isSaving || isReordering}
            onClick={() => onMove(-1)}
            aria-label={`Move ${addon.name} up`}
            className="rounded-md p-1.5 text-tertiary/55 transition-colors hover:bg-tertiary/5 hover:text-tertiary disabled:opacity-30"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            disabled={!canMoveDown || isSaving || isReordering}
            onClick={() => onMove(1)}
            aria-label={`Move ${addon.name} down`}
            className="rounded-md p-1.5 text-tertiary/55 transition-colors hover:bg-tertiary/5 hover:text-tertiary disabled:opacity-30"
          >
            <ArrowDown aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-tertiary/8 pt-3">
        <button type="button" onClick={onEdit} className={cn(QUIET, "inline-flex items-center gap-1.5 text-tertiary")}>
          <PencilLine aria-hidden="true" className="size-3.5" />
          Edit
          <span className="sr-only"> {addon.name}</span>
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void toggleActive()}
          className={cn(QUIET, addon.active ? "text-primary" : "text-green-700")}
        >
          {addon.active ? "Retire" : "Restore"}
        </button>
        {!addon.active && (
          <span className="text-xs text-tertiary/50">Hidden from venues and customers. Prices are kept.</span>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-primary">
          {error}
        </p>
      )}
    </li>
  );
};

const AdminAddonsPage = () => {
  const { addonTypes, error, isLoading, create, update, reorder } = useAddonTypes();
  const [form, setForm] = useState<{ editing: AddonTypeView | null } | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  // State lags a key press; the ref stops a second move in the same tick.
  const moving = useRef(false);
  const retired = addonTypes.filter((addon) => !addon.active).length;

  const move = async (index: number, step: -1 | 1) => {
    if (moving.current) return;
    moving.current = true;
    setIsReordering(true);
    try {
      await reorder(reorderChanges(addonTypes, index, step));
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      moving.current = false;
      setIsReordering(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Add-ons"
        description="The extras venues can offer with a booking. Growth Hub decides the list; each venue sets its own price."
        actions={
          <button
            type="button"
            onClick={() => setForm({ editing: null })}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:opacity-95"
          >
            <Plus aria-hidden="true" className="size-4" />
            New add-on type
          </button>
        }
      />

      <section aria-labelledby="addons-heading" className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="addons-heading" className="text-base font-bold text-tertiary">
            Add-on types
          </h2>
          {!isLoading && !error && addonTypes.length > 0 && (
            <p className="text-sm text-tertiary/55">
              {addonTypes.length - retired} available{retired > 0 && `, ${retired} retired`}
            </p>
          )}
        </div>
        {isLoading ? (
          <div className="mt-3">
            <Skeleton />
          </div>
        ) : error ? (
          <p role="alert" className="mt-3 text-sm text-primary">
            We couldn&apos;t load the add-on types. Refresh to try again.
          </p>
        ) : addonTypes.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-tertiary/15 p-6 text-center">
            <p className="text-sm text-tertiary/55">No add-on types yet.</p>
            <button type="button" onClick={() => setForm({ editing: null })} className={cn(QUIET, "mt-2 text-primary")}>
              Add the first one
            </button>
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {addonTypes.map((addon, index) => (
              <AddonRow
                key={addon.id}
                addon={addon}
                canMoveUp={index > 0}
                canMoveDown={index < addonTypes.length - 1}
                isReordering={isReordering}
                onMove={(step) => void move(index, step)}
                onEdit={() => setForm({ editing: addon })}
                onUpdate={update}
              />
            ))}
          </ul>
        )}
      </section>

      {form && (
        <FormModal label={form.editing ? `Edit ${form.editing.name}` : "New add-on type"} onClose={() => setForm(null)}>
          <AddonTypeForm
            editing={form.editing}
            nextOrder={nextSortOrder(addonTypes)}
            isReady={!isLoading && !error}
            onCreate={create}
            onUpdate={update}
            onDone={() => setForm(null)}
            onCancel={() => setForm(null)}
          />
        </FormModal>
      )}
    </>
  );
};

export default AdminAddonsPage;
