"use client";

import type { FormEvent, ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { AMENITIES } from "@/data/amenities";
import { useCatalogueLabels } from "@/hooks/useCatalogueLabels";
import { WORKSPACE_TYPE_OPTIONS } from "@/data/searchOptions";
import {
  MEMBERSHIP_LENGTH_KEYS,
  MEMBERSHIP_LENGTH_LABELS,
  MEMBERSHIP_SPACES,
  MEMBERSHIP_SPACE_LABELS,
} from "@/types/catalogue";
import { cn } from "@/utils";
import Toggle from "../Toggle";
import { Chip, Field, QUIET, RAISED, Section, inputClass } from "./fields";
import PhotosSection from "./PhotosSection";
import type { DraftErrors, VenueDraft } from "./venueDraft";

const DAYS = [
  { value: 0, short: "S", name: "Sunday" },
  { value: 1, short: "M", name: "Monday" },
  { value: 2, short: "T", name: "Tuesday" },
  { value: 3, short: "W", name: "Wednesday" },
  { value: 4, short: "T", name: "Thursday" },
  { value: 5, short: "F", name: "Friday" },
  { value: 6, short: "S", name: "Saturday" },
];

const MAX_RULES = 20;

const VALID_SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;

const digits = (value: string) => value.replace(/\D/g, "");
const decimals = (value: string) => value.replace(/[^\d.]/g, "");

type VenueFormProps = {
  mode: "create" | "edit";
  draft: VenueDraft;
  errors: DraftErrors;
  onChange: <K extends keyof VenueDraft>(key: K, value: VenueDraft[K]) => void;
  onSubmit: () => void;
  isSaving: boolean;
  /** Saved and failed messages, shown above the Save button. */
  status?: ReactNode;
  /** Cards that act on their own, such as the seat map, shown after the form sections. */
  extra?: ReactNode;
};

const VenueForm = ({ mode, draft, errors, onChange, onSubmit, isSaving, status, extra }: VenueFormProps) => {
  const labels = useCatalogueLabels();
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const toggleIn = (key: "amenities" | "workspaceTypes", value: string) =>
    onChange(
      key,
      draft[key].includes(value) ? draft[key].filter((item) => item !== value) : [...draft[key], value],
    );

  const toggleDay = (day: number) =>
    onChange(
      "openDays",
      draft.openDays.includes(day)
        ? draft.openDays.filter((item) => item !== day)
        : [...draft.openDays, day].sort((a, b) => a - b),
    );

  const setPrice = (space: (typeof MEMBERSHIP_SPACES)[number], length: (typeof MEMBERSHIP_LENGTH_KEYS)[number], value: string) =>
    onChange("membershipPrices", {
      ...draft.membershipPrices,
      [space]: { ...draft.membershipPrices[space], [length]: digits(value) },
    });

  const setRule = (index: number, value: string) =>
    onChange(
      "rules",
      draft.rules.map((rule, item) => (item === index ? value : rule)),
    );

  const publishError = errors.published;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        {mode === "edit" && (
          <Section title="Listing">
            <Toggle
              checked={draft.published}
              onChange={(checked) => onChange("published", checked)}
              label={
                draft.published
                  ? "Published: members can find and book it"
                  : "Hidden: not in search, can't be booked"
              }
            />
            {publishError && (
              <p role="alert" className="mt-2 text-sm text-primary">
                {publishError}
              </p>
            )}
          </Section>
        )}

        <Section title="Details">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="venue-name" label="Name" error={errors.name}>
              <input
                id="venue-name"
                value={draft.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="The venue's name"
                className={inputClass(Boolean(errors.name))}
              />
            </Field>
            {mode === "create" && (
              <Field id="venue-slug" label="Web address" error={errors.slug}>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm text-tertiary/50">/workspaces/</span>
                  <input
                    id="venue-slug"
                    value={draft.slug}
                    onChange={(event) =>
                      onChange("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    placeholder="venue-name-locality"
                    className={inputClass(Boolean(errors.slug), "min-w-0 font-mono")}
                  />
                </div>
                <p className="mt-1.5 text-xs text-tertiary/50">This can&apos;t be changed later.</p>
              </Field>
            )}
            <Field id="venue-locality" label="Locality" error={errors.locality}>
              <input
                id="venue-locality"
                value={draft.locality}
                onChange={(event) => onChange("locality", event.target.value)}
                placeholder="Neighbourhood, such as Koramangala"
                className={inputClass(Boolean(errors.locality))}
              />
            </Field>
            <Field id="venue-city" label="City" error={errors.city}>
              <input
                id="venue-city"
                value={draft.city}
                onChange={(event) => onChange("city", event.target.value)}
                className={inputClass(Boolean(errors.city))}
              />
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5">
            <Field id="venue-description" label="Card description" error={errors.description} optional>
              <textarea
                id="venue-description"
                rows={2}
                maxLength={300}
                value={draft.description}
                onChange={(event) => onChange("description", event.target.value)}
                placeholder="One or two lines shown on venue cards"
                className={inputClass(Boolean(errors.description), "resize-y")}
              />
            </Field>
            <Field id="venue-long" label="About this space" error={errors.longDescription} optional>
              <textarea
                id="venue-long"
                rows={5}
                maxLength={3000}
                value={draft.longDescription}
                onChange={(event) => onChange("longDescription", event.target.value)}
                placeholder="The full description on the venue page"
                className={inputClass(Boolean(errors.longDescription), "resize-y")}
              />
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="venue-rating" label="Rating (0 to 5)" error={errors.rating}>
              <input
                id="venue-rating"
                inputMode="decimal"
                value={draft.rating}
                onChange={(event) => onChange("rating", decimals(event.target.value))}
                className={inputClass(Boolean(errors.rating))}
              />
            </Field>
            <Field id="venue-distance" label="Distance from centre (km)" error={errors.distanceKm}>
              <input
                id="venue-distance"
                inputMode="decimal"
                value={draft.distanceKm}
                onChange={(event) => onChange("distanceKm", decimals(event.target.value))}
                className={inputClass(Boolean(errors.distanceKm))}
              />
            </Field>
          </div>
        </Section>

        <Section title="Location and hours" hint="Bookings can only be made inside these days and times.">
          <Field id="venue-maps" label="Google Maps link" error={errors.googleMapsUrl} optional>
            <input
              id="venue-maps"
              type="url"
              value={draft.googleMapsUrl}
              onChange={(event) => onChange("googleMapsUrl", event.target.value)}
              placeholder="The Share link from Google Maps"
              className={inputClass(Boolean(errors.googleMapsUrl))}
            />
          </Field>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-tertiary">Open days</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((item) => {
                const isOn = draft.openDays.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={isOn}
                    aria-label={item.name}
                    onClick={() => toggleDay(item.value)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full border text-sm font-medium transition-all",
                      isOn
                        ? "cta-gradient border-transparent text-secondary shadow-sm"
                        : "border-tertiary/15 text-tertiary/60 hover:border-tertiary/35",
                    )}
                  >
                    {item.short}
                  </button>
                );
              })}
            </div>
            {errors.openDays && <p className="mt-1.5 text-sm text-primary">{errors.openDays}</p>}
          </fieldset>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="venue-opens" label="Opens at" error={errors.opensAt}>
              <input
                id="venue-opens"
                type="time"
                value={draft.opensAt}
                onChange={(event) => onChange("opensAt", event.target.value)}
                className={inputClass(Boolean(errors.opensAt))}
              />
            </Field>
            <Field id="venue-closes" label="Closes at" error={errors.closesAt}>
              <input
                id="venue-closes"
                type="time"
                value={draft.closesAt}
                onChange={(event) => onChange("closesAt", event.target.value)}
                className={inputClass(Boolean(errors.closesAt))}
              />
            </Field>
            <Field id="venue-days-label" label="Days label" error={errors.openDaysLabel} optional>
              <input
                id="venue-days-label"
                maxLength={40}
                value={draft.openDaysLabel}
                onChange={(event) => onChange("openDaysLabel", event.target.value)}
                placeholder="Shown on the venue page, such as Open Daily"
                className={inputClass(Boolean(errors.openDaysLabel))}
              />
            </Field>
            <Field id="venue-hours-note" label="Hours note" error={errors.hoursNote} optional>
              <input
                id="venue-hours-note"
                maxLength={300}
                value={draft.hoursNote}
                onChange={(event) => onChange("hoursNote", event.target.value)}
                placeholder="Holidays, weekend access and similar"
                className={inputClass(Boolean(errors.hoursNote))}
              />
            </Field>
          </div>
        </Section>

        <PhotosSection
          ownerId={VALID_SLUG.test(draft.slug) ? draft.slug : ""}
          image={draft.image}
          gallery={draft.gallery}
          coverError={errors.image}
          onCover={(url) => onChange("image", url)}
          onGallery={(urls) => onChange("gallery", urls)}
        />

        <Section title="Spaces and amenities">
          <fieldset>
            <legend className="text-sm font-medium text-tertiary">Workspace types</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {WORKSPACE_TYPE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={labels.workspaceType(option.value, option.label)}
                  isOn={draft.workspaceTypes.includes(option.value)}
                  onToggle={() => toggleIn("workspaceTypes", option.value)}
                />
              ))}
            </div>
            {errors.workspaceTypes && <p className="mt-1.5 text-sm text-primary">{errors.workspaceTypes}</p>}
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-tertiary">Amenities</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {AMENITIES.map((amenity) => (
                <Chip
                  key={amenity.id}
                  label={labels.amenity(amenity.id, amenity.label)}
                  isOn={draft.amenities.includes(amenity.id)}
                  onToggle={() => toggleIn("amenities", amenity.id)}
                />
              ))}
            </div>
          </fieldset>
        </Section>

        <Section
          title="House rules"
          action={
            <button
              type="button"
              disabled={draft.rules.length >= MAX_RULES}
              onClick={() => onChange("rules", [...draft.rules, ""])}
              className={cn(QUIET, "inline-flex items-center gap-1.5 text-primary")}
            >
              <Plus aria-hidden="true" className="size-4" />
              Add rule
            </button>
          }
        >
          {draft.rules.length === 0 ? (
            <p className="text-sm text-tertiary/50">No rules yet.</p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {draft.rules.map((rule, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-right text-sm text-tertiary/45">{index + 1}</span>
                  <input
                    aria-label={`Rule ${index + 1}`}
                    maxLength={200}
                    value={rule}
                    onChange={(event) => setRule(index, event.target.value)}
                    placeholder="One rule per line"
                    className={inputClass(false)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        "rules",
                        draft.rules.filter((_, item) => item !== index),
                      )
                    }
                    aria-label={`Remove rule ${index + 1}`}
                    className="rounded-md p-1.5 text-tertiary/50 transition-colors hover:bg-tertiary/5 hover:text-tertiary"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Pass prices" hint="Set each price yourself, as the final price members pay. Leave a box empty if the venue doesn't sell that pass.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field id="venue-hourly" label="Hourly (₹)" error={errors.startingPrice}>
              <input
                id="venue-hourly"
                inputMode="numeric"
                placeholder="Not sold"
                value={draft.startingPrice}
                onChange={(event) => onChange("startingPrice", digits(event.target.value))}
                className={inputClass(Boolean(errors.startingPrice))}
              />
            </Field>
            <Field id="venue-half" label="Half day (₹)" error={errors.halfDayPrice}>
              <input
                id="venue-half"
                inputMode="numeric"
                placeholder="Not sold"
                value={draft.halfDayPrice}
                onChange={(event) => onChange("halfDayPrice", digits(event.target.value))}
                className={inputClass(Boolean(errors.halfDayPrice))}
              />
            </Field>
            <Field id="venue-day" label="Day pass (₹)" error={errors.dayPassPrice}>
              <input
                id="venue-day"
                inputMode="numeric"
                placeholder="Not sold"
                value={draft.dayPassPrice}
                onChange={(event) => onChange("dayPassPrice", digits(event.target.value))}
                className={inputClass(Boolean(errors.dayPassPrice))}
              />
            </Field>
          </div>
        </Section>

        <Section
          title="Membership prices"
          hint="Rupees per cycle for one desk or one room, as the final price. Leave a cell blank if the venue doesn't offer it."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-tertiary/50">
                  <th scope="col" className="pb-2 pr-3 font-semibold">Space</th>
                  {MEMBERSHIP_LENGTH_KEYS.map((length) => (
                    <th key={length} scope="col" className="pb-2 pr-3 font-semibold">
                      {MEMBERSHIP_LENGTH_LABELS[length]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEMBERSHIP_SPACES.map((space) => (
                  <tr key={space}>
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium text-tertiary">
                      {MEMBERSHIP_SPACE_LABELS[space]}
                    </th>
                    {MEMBERSHIP_LENGTH_KEYS.map((length) => {
                      const cellError = errors[`membershipPrices.${space}.${length}`];
                      return (
                        <td key={length} className="py-1.5 pr-3">
                          <input
                            aria-label={`${MEMBERSHIP_SPACE_LABELS[space]}, ${MEMBERSHIP_LENGTH_LABELS[length]}`}
                            aria-invalid={Boolean(cellError)}
                            title={cellError}
                            inputMode="numeric"
                            value={draft.membershipPrices[space][length]}
                            onChange={(event) => setPrice(space, length, event.target.value)}
                            placeholder="Not offered"
                            className={inputClass(Boolean(cellError), "w-28 px-2.5 py-2 text-right")}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Object.keys(errors).some((key) => key.startsWith("membershipPrices")) && (
            <p className="mt-2 text-sm text-primary">Prices are whole rupees above 0, or blank.</p>
          )}
        </Section>

        <Section title="Offer" hint="A label on the listing. It does not change prices.">
          <Toggle
            checked={draft.hasOffer}
            onChange={(checked) => onChange("hasOffer", checked)}
            label={draft.hasOffer ? "Offer shown on the listing" : "No offer"}
          />
          {draft.hasOffer && (
            <div className="mt-5 grid grid-cols-1 gap-5">
              <Field id="venue-offer-label" label="Label" error={errors.offerLabel}>
                <input
                  id="venue-offer-label"
                  maxLength={40}
                  value={draft.offerLabel}
                  onChange={(event) => onChange("offerLabel", event.target.value)}
                  placeholder="Flat 20% OFF"
                  className={inputClass(Boolean(errors.offerLabel))}
                />
              </Field>
              <Field id="venue-offer-details" label="Details" error={errors.offerDetails}>
                <textarea
                  id="venue-offer-details"
                  rows={3}
                  maxLength={300}
                  value={draft.offerDetails}
                  onChange={(event) => onChange("offerDetails", event.target.value)}
                  placeholder="What it applies to and any limits"
                  className={inputClass(Boolean(errors.offerDetails), "resize-y")}
                />
              </Field>
            </div>
          )}
        </Section>

        {extra}
      </div>

      <aside className="flex h-fit flex-col gap-4 xl:sticky xl:top-24">
        <section className={cn(RAISED, "p-5")}>
          <h2 className="text-base font-bold text-tertiary">Price preview</h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            {[
              { label: "Hourly", value: draft.startingPrice, unit: "hr" },
              { label: "Half day", value: draft.halfDayPrice, unit: "half day" },
              { label: "Full day", value: draft.dayPassPrice, unit: "day" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <dt className="text-tertiary/60">{row.label}</dt>
                <dd className={row.value ? "font-medium text-tertiary" : "text-tertiary/45"}>
                  {row.value ? (
                    <>
                      ₹{Number(row.value).toLocaleString("en-IN")}
                      <span className="font-normal text-tertiary/50">/{row.unit}</span>
                    </>
                  ) : (
                    "Not sold"
                  )}
                </dd>
              </div>
            ))}
            {MEMBERSHIP_LENGTH_KEYS.map((length) => {
              const price = Number(draft.membershipPrices.desk[length]);
              return (
                <div key={length} className="flex items-center justify-between gap-3">
                  <dt className="text-tertiary/60">Desk, {MEMBERSHIP_LENGTH_LABELS[length]}</dt>
                  <dd className={price ? "font-medium text-tertiary" : "text-tertiary/45"}>
                    {price ? `₹${price.toLocaleString("en-IN")}` : "Not offered"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        <div className={cn(RAISED, "flex flex-col gap-3 p-5")}>
          {status}
          <button
            type="submit"
            disabled={isSaving}
            className="cta-gradient rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : mode === "create" ? "Create venue" : "Save changes"}
          </button>
          {mode === "create" && (
            <p className="text-xs text-tertiary/55">
              New venues start hidden. Assign a seat map on the next screen, then publish.
            </p>
          )}
        </div>
      </aside>
    </form>
  );
};

export default VenueForm;
