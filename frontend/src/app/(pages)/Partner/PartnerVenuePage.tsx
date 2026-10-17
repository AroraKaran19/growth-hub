"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Armchair, Building2, ExternalLink, Eye, EyeOff, Landmark, Link2, Lock, MapPin, Sparkles } from "lucide-react";
import { useAmenities } from "@/hooks/useAmenities";
import { useMyPayoutAccount } from "@/hooks/usePayouts";
import { usePartnerVenue } from "@/hooks/useVenues";
import { readApiError } from "@/libs/api/errors";
import { uploadPartnerImage } from "@/libs/api/uploads";
import { toastDone, toastFailed } from "@/libs/toast";
import type { PartnerListingInput, PartnerVenue } from "@/types/venue";
import { cn } from "@/utils";
import { windowOfHours } from "@/utils/venueHours";
import { Chip, Field, QUIET, RAISED, Section, inputClass } from "../Admin/components/venue/fields";
import PhotosSection from "../Admin/components/venue/PhotosSection";
import {
  MIN_GALLERY_PHOTOS,
  draftState,
  errorsFromApi,
  hoursFromDraft,
  weekDraft,
  type DayDraft,
  type DraftErrors,
} from "../Admin/components/venue/venueDraft";
import WeeklyHoursEditor from "../Admin/components/venue/WeeklyHoursEditor";
import { PartnerPageHeader, PartnerSkeleton } from "./components/PartnerUi";

type ListingDraft = {
  description: string;
  longDescription: string;
  hours: DayDraft[];
  hoursNote: string;
  image: string;
  gallery: string[];
  amenities: string[];
};

type ListingField = keyof ListingDraft;
type ListingChanges = Omit<PartnerListingInput, "version">;

const SECTION_OF: Record<ListingField, string> = {
  description: "About",
  longDescription: "About",
  hours: "Hours",
  hoursNote: "Hours",
  image: "Photos",
  gallery: "Photos",
  amenities: "Amenities",
};

const draftOf = (venue: PartnerVenue): ListingDraft => ({
  description: venue.description,
  longDescription: venue.longDescription,
  hours: weekDraft(venue.hours),
  hoursNote: venue.hoursNote,
  image: venue.image,
  gallery: venue.gallery,
  amenities: venue.amenities,
});

const payloadOf = (draft: ListingDraft): Required<ListingChanges> => ({
  description: draft.description.trim(),
  longDescription: draft.longDescription.trim(),
  hours: hoursFromDraft(draft.hours),
  hoursNote: draft.hoursNote.trim(),
  image: draft.image,
  gallery: draft.gallery,
  amenities: draft.amenities,
});

// Only edited fields are sent, so an untouched section never blocks a save.
const changesOf = (draft: ListingDraft, venue: PartnerVenue): ListingChanges => {
  const next = payloadOf(draft);
  const saved = payloadOf(draftOf(venue));
  return Object.fromEntries(
    (Object.keys(next) as ListingField[])
      .filter((key) => JSON.stringify(next[key]) !== JSON.stringify(saved[key]))
      .map((key) => [key, next[key]]),
  ) as ListingChanges;
};

const validate = (draft: ListingDraft, isLive: boolean): DraftErrors => {
  const errors: DraftErrors = {};
  for (const row of draft.hours) {
    if (row.isOpen && !windowOfHours(row)) errors[`hours.${row.day}`] = "Closing time must be after opening time.";
  }
  if (isLive && !draft.hours.some((row) => row.isOpen)) errors.hours = "Open at least one day to keep the venue live.";
  if (draft.gallery.length < MIN_GALLERY_PHOTOS) errors.gallery = `Add at least ${MIN_GALLERY_PHOTOS} gallery photos.`;
  return errors;
};

const AmenitiesSection = ({ selected, onChange }: { selected: string[]; onChange: (keys: string[]) => void }) => {
  const { amenities, isLoading } = useAmenities();
  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);

  return (
    <Section title="Amenities" hint="Tick what members can use at your venue. They show on your listing.">
      {isLoading ? (
        <div className="flex flex-wrap gap-2" aria-busy="true" aria-label="Loading amenities">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="h-9 w-32 animate-pulse rounded-full bg-tertiary/6" />
          ))}
        </div>
      ) : amenities.length === 0 ? (
        <p className="text-sm text-tertiary/55">Growth Hub hasn&apos;t added any amenities yet.</p>
      ) : (
        <fieldset>
          <legend className="sr-only">Amenities</legend>
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity) => (
              <Chip
                key={amenity.key}
                label={amenity.name}
                isOn={selected.includes(amenity.key)}
                onToggle={() => toggle(amenity.key)}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-tertiary/55">
            {selected.filter((key) => amenities.some((amenity) => amenity.key === key)).length} of {amenities.length} ticked
          </p>
        </fieldset>
      )}
    </Section>
  );
};

type ManagedRowProps = { icon: typeof Building2; label: string; children: ReactNode };

const ManagedRow = ({ icon: Icon, label, children }: ManagedRowProps) => (
  <div className="flex items-start gap-3 rounded-xl bg-secondary px-4 py-3 shadow-sm shadow-tertiary/5">
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tertiary/6 text-tertiary/70">
      <Icon aria-hidden="true" className="size-4" />
    </span>
    <div className="min-w-0">
      <dt className="text-xs text-tertiary/55">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-tertiary">{children}</dd>
    </div>
  </div>
);

const ManagedCard = ({ venue }: { venue: PartnerVenue }) => {
  const { payoutAccount, isLoading } = useMyPayoutAccount();
  const seatCount = venue.seatMap?.seats.length ?? 0;

  return (
    <section className="rounded-2xl border border-tertiary/8 bg-tertiary/4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-tertiary">Managed by Growth Hub</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-tertiary/60">
            <Lock aria-hidden="true" className="size-3.5" />
            Contact Growth Hub to change these.
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ManagedRow icon={Building2} label="Name">
          {venue.name}
        </ManagedRow>
        <ManagedRow icon={MapPin} label="Address">
          {venue.locality}, {venue.city}
        </ManagedRow>
        <ManagedRow icon={Link2} label="Listing link">
          <Link
            href={`/workspaces/${venue.slug}`}
            target="_blank"
            className="inline-flex max-w-full items-center gap-1.5 break-all text-primary hover:underline"
          >
            /workspaces/{venue.slug}
            <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
          </Link>
        </ManagedRow>
        <ManagedRow icon={venue.published ? Eye : EyeOff} label="Status">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
              venue.published ? "bg-emerald-600/12 text-emerald-700" : "bg-tertiary/8 text-tertiary/65",
            )}
          >
            {venue.published ? "Published" : "Hidden"}
          </span>
        </ManagedRow>
        <ManagedRow icon={Armchair} label="Seat map">
          {venue.seatMap ? `${seatCount} ${seatCount === 1 ? "seat" : "seats"}` : "Not assigned yet"}
        </ManagedRow>
        <ManagedRow icon={Landmark} label="Bank details">
          {isLoading
            ? "Loading..."
            : payoutAccount
              ? `${payoutAccount.bankName || payoutAccount.accountName}, ending ${payoutAccount.accountNumberLast4}`
              : "Not added yet"}
        </ManagedRow>
      </dl>
    </section>
  );
};

type SaveBarProps = { sections: string[]; isSaving: boolean; isBlocked: boolean };

const SaveBar = ({ sections, isSaving, isBlocked }: SaveBarProps) => {
  const isDirty = sections.length > 0;
  return (
    <div className="sticky bottom-4 z-20">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-xl transition-colors sm:px-5",
          isDirty ? "bg-tertiary text-secondary shadow-tertiary/25" : "border border-tertiary/8 bg-secondary text-tertiary shadow-tertiary/5",
        )}
      >
        <div aria-live="polite" className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          {isDirty ? (
            <>
              <span className="font-medium">Unsaved changes</span>
              {sections.map((section) => (
                <span key={section} className="rounded-full bg-secondary/12 px-2.5 py-0.5 text-xs font-medium">
                  {section}
                </span>
              ))}
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-tertiary/60">
              <Sparkles aria-hidden="true" className="size-4 text-primary" />
              Your listing is up to date
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!isDirty || isSaving || isBlocked}
          className="cta-gradient rounded-lg px-6 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
};

type EditorProps = Pick<ReturnType<typeof usePartnerVenue>, "saveListing" | "refresh"> & { venue: PartnerVenue };

const ListingEditor = ({ venue, saveListing, refresh }: EditorProps) => {
  const [draft, setDraft] = useState(() => draftOf(venue));
  // The version the draft was loaded at, so a newer save elsewhere is never overwritten.
  const [baseVersion, setBaseVersion] = useState(venue.version);
  const [base, setBase] = useState(venue);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const changes = changesOf(draft, base);
  const isDirty = Object.keys(changes).length > 0;
  const sections = [...new Set((Object.keys(changes) as ListingField[]).map((key) => SECTION_OF[key]))];
  const state = draftState({ baseVersion, venueVersion: venue.version, isDirty });

  const loadLatest = () => {
    setDraft(draftOf(venue));
    setBase(venue);
    setBaseVersion(venue.version);
    setErrors({});
  };

  if (state === "adopt") loadLatest();

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const set = <K extends ListingField>(key: K, value: ListingDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(draft, venue.published);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toastFailed("Check the highlighted fields.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await saveListing({ ...changes, version: baseVersion });
      setDraft(draftOf(updated));
      setBase(updated);
      setBaseVersion(updated.version);
      toastDone("Saved. Your listing updates across the site within a minute.");
    } catch (caught) {
      const info = readApiError(caught);
      const mapped = errorsFromApi(info);
      setErrors(mapped.errors);
      toastFailed(mapped.formError ?? info.message);
      if (info.code === "STALE_EDIT") refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-6">
      {state === "conflict" && (
        <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-tertiary shadow-sm">
          Your venue was changed somewhere else while you were editing. Your edits are still here, but they can&apos;t be
          saved over the newer version.
          <button type="button" onClick={loadLatest} className={cn(QUIET, "mt-2 block text-primary")}>
            Discard my edits and load the latest
          </button>
        </div>
      )}

      <Section title="About" hint="How your venue introduces itself on cards and on its own page.">
        <div className="grid grid-cols-1 gap-5">
          <Field id="partner-venue-description" label="Card description" error={errors.description} optional>
            <textarea
              id="partner-venue-description"
              rows={2}
              maxLength={300}
              value={draft.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="One or two lines shown on venue cards"
              className={inputClass(Boolean(errors.description), "resize-y")}
            />
            <p className="mt-1 text-right text-xs text-tertiary/45">{draft.description.length} / 300</p>
          </Field>
          <Field id="partner-venue-about" label="About this space" error={errors.longDescription} optional>
            <textarea
              id="partner-venue-about"
              rows={6}
              maxLength={3000}
              value={draft.longDescription}
              onChange={(event) => set("longDescription", event.target.value)}
              placeholder="The full description on your venue page"
              className={inputClass(Boolean(errors.longDescription), "resize-y")}
            />
            <p className="mt-1 text-right text-xs text-tertiary/45">{draft.longDescription.length} / 3000</p>
          </Field>
        </div>
      </Section>

      <Section
        title="Hours"
        hint="Members can only book inside these times. A change can't leave existing bookings outside your hours."
      >
        <WeeklyHoursEditor rows={draft.hours} errors={errors} onChange={(rows) => set("hours", rows)} />
        <div className="mt-5">
          <Field id="partner-venue-hours-note" label="Hours note" error={errors.hoursNote} optional>
            <input
              id="partner-venue-hours-note"
              maxLength={300}
              value={draft.hoursNote}
              onChange={(event) => set("hoursNote", event.target.value)}
              placeholder="Public holidays, late access for members and similar"
              className={inputClass(Boolean(errors.hoursNote))}
            />
          </Field>
        </div>
      </Section>

      <PhotosSection
        ownerId={venue.slug}
        image={draft.image}
        gallery={draft.gallery}
        coverError={errors.image}
        galleryError={errors.gallery}
        onCover={(url) => set("image", url)}
        onGallery={(urls) => set("gallery", urls)}
        upload={uploadPartnerImage}
      />

      <AmenitiesSection selected={draft.amenities} onChange={(keys) => set("amenities", keys)} />

      <ManagedCard venue={venue} />

      <SaveBar sections={sections} isSaving={isSaving} isBlocked={state === "conflict"} />
    </form>
  );
};

/** The venue's own staff keep its listing fresh; Growth Hub owns the rest. */
const PartnerVenuePage = () => {
  const { venue, isLoading, saveListing, refresh } = usePartnerVenue();

  return (
    <>
      <PartnerPageHeader
        title="Venue settings"
        description="Your description, hours, photos and amenities, as members see them on your listing."
        actions={
          venue && (
            <Link
              href={`/workspaces/${venue.slug}`}
              target="_blank"
              className={cn(RAISED, "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-tertiary transition-transform hover:-translate-y-0.5")}
            >
              View listing
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </Link>
          )
        }
      />
      {isLoading || !venue ? (
        <div className="mt-6">
          <PartnerSkeleton />
        </div>
      ) : (
        <ListingEditor key={venue.slug} venue={venue} saveListing={saveListing} refresh={refresh} />
      )}
    </>
  );
};

export default PartnerVenuePage;
