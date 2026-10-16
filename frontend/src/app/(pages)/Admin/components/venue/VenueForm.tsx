"use client";

import type { FormEvent, ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { useAdminAmenities } from "@/hooks/useAmenities";
import { useCatalogueLabels } from "@/hooks/useCatalogueLabels";
import { WORKSPACE_TYPE_OPTIONS } from "@/data/searchOptions";
import { cn } from "@/utils";
import Toggle from "../Toggle";
import { Chip, Field, QUIET, RAISED, Section, inputClass } from "./fields";
import MembershipPlansCard from "./MembershipPlansCard";
import PhotosSection from "./PhotosSection";
import type { DraftErrors, VenueDraft } from "./venueDraft";
import WeeklyHoursEditor from "./WeeklyHoursEditor";

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
  const { amenities } = useAdminAmenities();
  // Hidden amenities stay pickable only on venues that already have them.
  const amenityChoices = amenities.filter((amenity) => amenity.visible || draft.amenities.includes(amenity.key));
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const toggleIn = (key: "amenities", value: string) =>
    onChange(
      key,
      draft[key].includes(value) ? draft[key].filter((item) => item !== value) : [...draft[key], value],
    );

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
            <Field id="venue-name" label="Name" error={errors.name} required>
              <input
                id="venue-name"
                aria-required="true"
                value={draft.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="The venue's name"
                className={inputClass(Boolean(errors.name))}
              />
            </Field>
            {mode === "create" && (
              <Field id="venue-slug" label="Web address" error={errors.slug} required>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm text-tertiary/50">/workspaces/</span>
                  <input
                    id="venue-slug"
                    aria-required="true"
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
            <Field id="venue-locality" label="Locality" error={errors.locality} required>
              <input
                id="venue-locality"
                aria-required="true"
                value={draft.locality}
                onChange={(event) => onChange("locality", event.target.value)}
                placeholder="Neighbourhood, such as Koramangala"
                className={inputClass(Boolean(errors.locality))}
              />
            </Field>
            <Field id="venue-city" label="City" error={errors.city} required>
              <input
                id="venue-city"
                aria-required="true"
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
            <Field id="venue-rating" label="Rating (0 to 5)" error={errors.rating} required>
              <input
                id="venue-rating"
                aria-required="true"
                inputMode="decimal"
                value={draft.rating}
                onChange={(event) => onChange("rating", decimals(event.target.value))}
                className={inputClass(Boolean(errors.rating))}
              />
            </Field>
            <Field id="venue-distance" label="Distance from centre (km)" error={errors.distanceKm} required>
              <input
                id="venue-distance"
                aria-required="true"
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

          <div className="mt-5">
            <WeeklyHoursEditor rows={draft.hours} errors={errors} onChange={(rows) => onChange("hours", rows)} />
          </div>

          <div className="mt-5">
            <Field id="venue-hours-note" label="Hours note" error={errors.hoursNote} optional>
              <input
                id="venue-hours-note"
                maxLength={300}
                value={draft.hoursNote}
                onChange={(event) => onChange("hoursNote", event.target.value)}
                placeholder="Public holidays, late access for members and similar"
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
          galleryError={errors.gallery}
          onCover={(url) => onChange("image", url)}
          onGallery={(urls) => onChange("gallery", urls)}
        />

        <Section title="Spaces and amenities">
          <div>
            <p className="text-sm font-medium text-tertiary">Workspace types</p>
            {draft.workspaceTypes.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {WORKSPACE_TYPE_OPTIONS.filter((option) => draft.workspaceTypes.includes(option.value)).map((option) => (
                  <li
                    key={option.value}
                    className="rounded-full bg-tertiary/6 px-3.5 py-1.5 text-sm font-medium text-tertiary"
                  >
                    {labels.workspaceType(option.value, option.label)}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 text-xs text-tertiary/55">
              {draft.workspaceTypes.length > 0
                ? "Set from the seat map and what the venue sells. Assign a different map or change prices and plans to update them."
                : "Filled in from the seat map once one is assigned and something is on sale."}
            </p>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-tertiary">Amenities</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {amenityChoices.map((amenity) => (
                <Chip
                  key={amenity.key}
                  label={amenity.visible ? amenity.name : `${amenity.name} (hidden)`}
                  isOn={draft.amenities.includes(amenity.key)}
                  onToggle={() => toggleIn("amenities", amenity.key)}
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

        <Section id="prices" title="Pass prices" hint="Set each price yourself, as the final price members pay. Leave a box empty if the venue doesn't sell that pass.">
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

        <MembershipPlansCard venueSlug={mode === "edit" ? draft.slug : null} />

        <Section title="Offer" hint="A label on the listing. It does not change prices.">
          <Toggle
            checked={draft.hasOffer}
            onChange={(checked) => onChange("hasOffer", checked)}
            label={draft.hasOffer ? "Offer shown on the listing" : "No offer"}
          />
          {draft.hasOffer && (
            <div className="mt-5 grid grid-cols-1 gap-5">
              <Field id="venue-offer-label" label="Label" error={errors.offerLabel} required>
                <input
                  id="venue-offer-label"
                  aria-required="true"
                  maxLength={40}
                  value={draft.offerLabel}
                  onChange={(event) => onChange("offerLabel", event.target.value)}
                  placeholder="Flat 20% OFF"
                  className={inputClass(Boolean(errors.offerLabel))}
                />
              </Field>
              <Field id="venue-offer-details" label="Details" error={errors.offerDetails} required>
                <textarea
                  id="venue-offer-details"
                  aria-required="true"
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
