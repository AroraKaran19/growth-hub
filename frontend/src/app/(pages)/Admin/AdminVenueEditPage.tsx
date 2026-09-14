"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, ExternalLink } from "lucide-react";
import { MEMBERSHIP_LENGTH_DETAILS } from "@/data/membershipPlans";
import { VENUES } from "@/data/venues";
import { useVenueCatalog, type CatalogVenue } from "@/stores/venues";
import { MEMBERSHIP_LENGTHS, PASS_TYPES, type BookingType } from "@/types/booking";
import { cn } from "@/utils";
import { rateFor } from "../Booking/pricing";
import {
  PARTNER_CARD as CARD,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import Toggle from "./components/Toggle";

const INPUT =
  "w-full rounded-lg border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const LABEL = "mb-1.5 block text-sm font-medium text-tertiary";

const PREVIEW_LABELS: Record<BookingType, string> = {
  hourly: "Hourly",
  "half-day": "Half day",
  "full-day": "Full day",
  weekly: MEMBERSHIP_LENGTH_DETAILS.weekly.plan,
  monthly: MEMBERSHIP_LENGTH_DETAILS.monthly.plan,
  quarterly: MEMBERSHIP_LENGTH_DETAILS.quarterly.plan,
  "half-yearly": MEMBERSHIP_LENGTH_DETAILS["half-yearly"].plan,
};

type Draft = {
  published: boolean;
  startingPrice: string;
  dayPassPrice: string;
  seatsAvailable: string;
  hasOffer: boolean;
  offerLabel: string;
  offerDetails: string;
};

type Errors = Partial<Record<keyof Draft, string>>;

const toDraft = (venue: CatalogVenue): Draft => ({
  published: venue.published,
  startingPrice: String(venue.startingPrice),
  dayPassPrice: String(venue.dayPassPrice),
  seatsAvailable: String(venue.seatsAvailable),
  hasOffer: Boolean(venue.offer),
  offerLabel: venue.offer?.label ?? "",
  offerDetails: venue.offer?.details ?? "",
});

const wholeNumber = (value: string) =>
  /^\d+$/.test(value.trim()) ? Number(value) : NaN;

const validate = (draft: Draft): Errors => {
  const errors: Errors = {};
  const hourly = wholeNumber(draft.startingPrice);
  const day = wholeNumber(draft.dayPassPrice);
  const seats = wholeNumber(draft.seatsAvailable);

  if (!(hourly > 0)) errors.startingPrice = "Enter an hourly rate above ₹0.";
  if (!(day > 0)) errors.dayPassPrice = "Enter a day pass rate above ₹0.";
  else if (hourly > day) {
    errors.dayPassPrice = "A day pass can't cost less than one hour.";
  }
  if (!(seats >= 0)) errors.seatsAvailable = "Enter a whole number of seats.";
  if (draft.hasOffer && draft.offerLabel.trim().length < 3) {
    errors.offerLabel = "Give the offer a short label, like Flat 20% OFF.";
  }
  if (draft.hasOffer && draft.offerDetails.trim().length < 10) {
    errors.offerDetails = "Explain what the offer covers.";
  }
  return errors;
};

const VenueEditor = ({ venue }: { venue: CatalogVenue }) => {
  const catalog = useVenueCatalog();
  const original = VENUES.find((item) => item.slug === venue.slug);
  const [draft, setDraft] = useState<Draft>(() => toDraft(venue));
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const preview = {
    ...venue,
    startingPrice: wholeNumber(draft.startingPrice) || 0,
    dayPassPrice: wholeNumber(draft.dayPassPrice) || 0,
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    catalog.updateVenue(venue.slug, {
      published: draft.published,
      startingPrice: Number(draft.startingPrice),
      dayPassPrice: Number(draft.dayPassPrice),
      seatsAvailable: Number(draft.seatsAvailable),
      offer: draft.hasOffer
        ? { label: draft.offerLabel.trim(), details: draft.offerDetails.trim() }
        : null,
    });
    setSaved(true);
  };

  const handleReset = () => {
    catalog.resetVenue(venue.slug);
    if (original) setDraft(toDraft({ ...original, published: true }));
    setErrors({});
    setSaved(false);
  };

  const field = (key: keyof Draft) =>
    cn(INPUT, errors[key] ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35");

  const errorText = (key: keyof Draft) =>
    errors[key] && <p className="mt-1.5 text-sm text-primary">{errors[key]}</p>;

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-6">
        <section className={`${CARD} p-5 sm:p-6`}>
          <h2 className="text-base font-bold text-tertiary">Listing</h2>
          <div className="mt-4">
            <Toggle
              checked={draft.published}
              onChange={(checked) => set("published", checked)}
              label={draft.published ? "Published: members can find and book it" : "Hidden: not in search, can't be booked"}
            />
          </div>
          <div className="mt-5 max-w-xs">
            <label htmlFor="venue-seats" className={LABEL}>Seats listed</label>
            <input
              id="venue-seats"
              inputMode="numeric"
              value={draft.seatsAvailable}
              onChange={(event) => set("seatsAvailable", event.target.value.replace(/\D/g, ""))}
              className={field("seatsAvailable")}
            />
            {errorText("seatsAvailable")}
          </div>
        </section>

        <section className={`${CARD} p-5 sm:p-6`}>
          <h2 className="text-base font-bold text-tertiary">Rates</h2>
          <p className="mt-1 text-sm text-tertiary/60">
            Passes and memberships are all priced from these two rates. GST included.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="venue-hourly" className={LABEL}>Hourly rate (₹)</label>
              <input
                id="venue-hourly"
                inputMode="numeric"
                value={draft.startingPrice}
                onChange={(event) => set("startingPrice", event.target.value.replace(/\D/g, ""))}
                className={field("startingPrice")}
              />
              {errorText("startingPrice")}
            </div>
            <div>
              <label htmlFor="venue-day" className={LABEL}>Day pass rate (₹)</label>
              <input
                id="venue-day"
                inputMode="numeric"
                value={draft.dayPassPrice}
                onChange={(event) => set("dayPassPrice", event.target.value.replace(/\D/g, ""))}
                className={field("dayPassPrice")}
              />
              {errorText("dayPassPrice")}
            </div>
          </div>
        </section>

        <section className={`${CARD} p-5 sm:p-6`}>
          <h2 className="text-base font-bold text-tertiary">Offer</h2>
          <div className="mt-4">
            <Toggle
              checked={draft.hasOffer}
              onChange={(checked) => set("hasOffer", checked)}
              label={draft.hasOffer ? "Offer shown on the listing" : "No offer"}
            />
          </div>
          {draft.hasOffer && (
            <div className="mt-5 grid grid-cols-1 gap-5">
              <div>
                <label htmlFor="venue-offer-label" className={LABEL}>Label</label>
                <input
                  id="venue-offer-label"
                  value={draft.offerLabel}
                  onChange={(event) => set("offerLabel", event.target.value)}
                  placeholder="Flat 20% OFF"
                  className={field("offerLabel")}
                />
                {errorText("offerLabel")}
              </div>
              <div>
                <label htmlFor="venue-offer-details" className={LABEL}>Details</label>
                <textarea
                  id="venue-offer-details"
                  rows={3}
                  value={draft.offerDetails}
                  onChange={(event) => set("offerDetails", event.target.value)}
                  placeholder="What it applies to and any limits"
                  className={cn(field("offerDetails"), "resize-y")}
                />
                {errorText("offerDetails")}
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="flex h-fit flex-col gap-4 xl:sticky xl:top-24">
        <section className={`${CARD} p-5`}>
          <h2 className="text-base font-bold text-tertiary">Price preview</h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            {[...PASS_TYPES, ...MEMBERSHIP_LENGTHS].map((type) => {
              const rate = rateFor(preview, type);
              return (
                <div key={type} className="flex items-center justify-between gap-3">
                  <dt className="text-tertiary/60">{PREVIEW_LABELS[type]}</dt>
                  <dd className="font-medium text-tertiary">
                    ₹{rate.amount.toLocaleString("en-IN")}
                    <span className="font-normal text-tertiary/50">/{rate.unit}</span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        <div className={`${CARD} flex flex-col gap-3 p-5`}>
          {saved && (
            <p role="status" className="flex items-center gap-2 text-sm text-green-700">
              <CircleCheck aria-hidden="true" className="size-4" />
              Saved. The listing is updated everywhere.
            </p>
          )}
          <button
            type="submit"
            className="cta-gradient rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            Save changes
          </button>
          {catalog.hasOverrides(venue.slug) && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-tertiary/20 px-5 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
            >
              Restore original listing
            </button>
          )}
        </div>
      </aside>
    </form>
  );
};

const AdminVenueEditPage = ({ slug }: { slug: string }) => {
  const catalog = useVenueCatalog();
  const venue = catalog.venues.find((item) => item.slug === slug);

  return (
    <>
      <Link
        href="/admin/venues"
        className="inline-flex items-center gap-2 text-sm text-tertiary/60 transition-colors hover:text-tertiary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All venues
      </Link>

      {!venue ? (
        <p className="mt-6 text-sm text-tertiary/60">Venue not found.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-tertiary">{venue.name}</h1>
              <p className="mt-1 text-sm text-tertiary/60">{venue.locality}, {venue.city}</p>
            </div>
            <Link
              href={`/workspaces/${venue.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm text-tertiary/65 hover:text-tertiary"
            >
              View listing
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </Link>
          </div>

          {/* Mounted only after hydration, so the form starts from saved changes. */}
          {catalog.isHydrated ? <VenueEditor venue={venue} /> : <div className="mt-6"><Skeleton /></div>}
        </>
      )}
    </>
  );
};

export default AdminVenueEditPage;
