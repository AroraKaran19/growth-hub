"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, CircleCheck, Puzzle } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { useAddonTypes, type AddonTypeChange } from "@/hooks/useAdminCatalogue";
import { readApiError } from "@/libs/api/errors";
import { ADDON_UNIT_LABELS, type AddonTypeView, type AddonUnit } from "@/types/catalogue";
import { cn } from "@/utils";
import {
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import { nextSortOrder, reorderChanges } from "./components/addonOrder";
import { Field, QUIET, RAISED, inputClass } from "./components/venue/fields";
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

const CreateAddonCard = ({
  nextOrder,
  isReady,
  onCreate,
}: {
  nextOrder: number;
  /** False until the list has loaded, so a new type never reuses an order. */
  isReady: boolean;
  onCreate: ReturnType<typeof useAddonTypes>["create"];
}) => {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [unit, setUnit] = useState<AddonUnit | "">("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Errors = {
      ...(name.trim().length < 2 && { name: "Enter a name." }),
      ...(!/^[a-z0-9][a-z0-9-]{1,62}$/.test(key) && { key: "Use lowercase letters, numbers or hyphens." }),
      ...(!unit && { unit: "Pick how it is charged." }),
    };
    setErrors(found);
    setFormError(null);
    setCreated(null);
    if (Object.keys(found).length > 0 || !unit) return;

    setIsSaving(true);
    try {
      await onCreate({ key, name: name.trim(), description: description.trim(), unit, sortOrder: nextOrder });
      setCreated(name.trim());
      setName("");
      setKey("");
      setKeyEdited(false);
      setUnit("");
      setDescription("");
    } catch (caught) {
      const info = readApiError(caught);
      if (info.code === "ADDON_KEY_TAKEN") setErrors({ key: "That key is already used." });
      else if (Object.keys(info.fields).length > 0) setErrors({ name: info.fields.name, key: info.fields.key, unit: info.fields.unit });
      else setFormError(info.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className={cn(RAISED, "h-fit p-5 sm:p-6")}>
      <div className="flex items-center gap-3">
        <span className="cta-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-secondary">
          <Puzzle aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-tertiary">New add-on type</h2>
          <p className="text-sm text-tertiary/55">Venues choose whether to offer it, and set their price.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Field id="addon-name" label="Name" error={errors.name}>
          <input
            id="addon-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!keyEdited) setKey(slugFromName(event.target.value));
            }}
            placeholder="What customers see, such as Locker"
            className={inputClass(Boolean(errors.name))}
          />
        </Field>
        <Field id="addon-key" label="Key" error={errors.key}>
          <input
            id="addon-key"
            value={key}
            onChange={(event) => {
              setKeyEdited(true);
              setKey(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            placeholder="A short id, fixed once created"
            className={inputClass(Boolean(errors.key), "font-mono")}
          />
        </Field>
        <div>
          <SelectField
            label="How it is charged"
            value={unit}
            onChange={(value) => setUnit(value as AddonUnit)}
            options={UNIT_OPTIONS}
            placeholder="Pick a unit"
          />
          <p className={cn("mt-1.5 text-sm", errors.unit ? "text-primary" : "text-tertiary/55")}>
            {errors.unit ?? (unit ? UNIT_HINTS[unit] : "This can't be changed later, because venues price in it.")}
          </p>
        </div>
        <Field id="addon-description" label="Description" optional>
          <input
            id="addon-description"
            maxLength={200}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="One line shown under the add-on"
            className={inputClass(false)}
          />
        </Field>
      </div>

      {created && (
        <p role="status" className="mt-4 flex items-start gap-2 text-sm text-green-700">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {created} is ready. Venues can now price it in their dashboard.
        </p>
      )}
      {formError && (
        <p role="alert" className="mt-4 text-sm text-primary">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving || !isReady}
        className="cta-gradient mt-5 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Adding..." : "Add add-on type"}
      </button>
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
  onUpdate: (id: string, change: AddonTypeChange) => Promise<void>;
};

const AddonRow = ({ addon, canMoveUp, canMoveDown, isReordering, onMove, onUpdate }: RowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(addon.name);
  const [description, setDescription] = useState(addon.description);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setIsSaving(true);
    setError(null);
    try {
      await action();
      setIsEditing(false);
    } catch (caught) {
      const info = readApiError(caught);
      setError(info.fields.name ?? info.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <li className={cn(RAISED, "p-4 sm:p-5", !addon.active && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
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
          <p className="mt-0.5 text-sm text-tertiary/55">
            <span className="font-mono text-xs">{addon.key}</span>
            {addon.description && ` · ${addon.description}`}
          </p>
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

      {isEditing ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            aria-label={`${addon.name} name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass(Boolean(error))}
          />
          <input
            aria-label={`${addon.name} description`}
            maxLength={200}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="One line shown under the add-on"
            className={inputClass(false)}
          />
          <div className="flex items-center gap-4 sm:col-span-2">
            <button
              type="button"
              disabled={isSaving || name.trim().length < 2}
              onClick={() => run(() => onUpdate(addon.id, { name: name.trim(), description: description.trim() }))}
              className="cta-gradient rounded-lg px-4 py-2 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setName(addon.name);
                setDescription(addon.description);
                setError(null);
                setIsEditing(false);
              }}
              className={cn(QUIET, "text-tertiary/60")}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-4 border-t border-tertiary/8 pt-3">
          <button type="button" onClick={() => setIsEditing(true)} className={cn(QUIET, "text-tertiary")}>
            Rename
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => run(() => onUpdate(addon.id, { active: !addon.active }))}
            className={cn(QUIET, addon.active ? "text-primary" : "text-green-700")}
          >
            {addon.active ? "Retire" : "Restore"}
          </button>
          {!addon.active && (
            <span className="text-xs text-tertiary/50">Hidden from venues and customers. Prices are kept.</span>
          )}
        </div>
      )}
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
  const [isReordering, setIsReordering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  // State lags a key press; the ref stops a second move in the same tick.
  const moving = useRef(false);

  const move = async (index: number, step: -1 | 1) => {
    if (moving.current) return;
    moving.current = true;
    setIsReordering(true);
    setOrderError(null);
    try {
      await reorder(reorderChanges(addonTypes, index, step));
    } catch (caught) {
      setOrderError(readApiError(caught).message);
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
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <CreateAddonCard
          nextOrder={nextSortOrder(addonTypes)}
          isReady={!isLoading && !error}
          onCreate={create}
        />

        <section aria-labelledby="addons-heading">
          <h2 id="addons-heading" className="text-base font-bold text-tertiary">
            Add-on types
          </h2>
          {orderError && (
            <p role="alert" className="mt-2 text-sm text-primary">
              {orderError}
            </p>
          )}
          {isLoading ? (
            <div className="mt-3">
              <Skeleton />
            </div>
          ) : error ? (
            <p role="alert" className="mt-3 text-sm text-primary">
              We couldn&apos;t load the add-on types. Refresh to try again.
            </p>
          ) : addonTypes.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-tertiary/15 p-6 text-center text-sm text-tertiary/55">
              No add-on types yet.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {addonTypes.map((addon, index) => (
                <AddonRow
                  key={`${addon.id}-${addon.name}-${addon.description}`}
                  addon={addon}
                  canMoveUp={index > 0}
                  canMoveDown={index < addonTypes.length - 1}
                  isReordering={isReordering}
                  onMove={(step) => void move(index, step)}
                  onUpdate={update}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
};

export default AdminAddonsPage;
