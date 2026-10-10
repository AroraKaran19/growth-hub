"use client";

import { useState } from "react";
import Link from "next/link";
import { patchVenueRow, useAdminVenues } from "@/hooks/useAdminCatalogue";
import { readApiError } from "@/libs/api/errors";
import { toastDone } from "@/libs/toast";
import type { AdminVenueRow } from "@/types/catalogue";
import { cn } from "@/utils";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import { rateError, rateField } from "./components/priceRow";

const INPUT =
  "w-24 rounded-lg border bg-secondary px-2.5 py-2 text-right text-sm text-tertiary outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const PriceRow = ({ venue, onSaved }: { venue: AdminVenueRow; onSaved: () => Promise<void> }) => {
  // Null means untouched, so the box follows the server and typing is never lost.
  const [typedHourly, setTypedHourly] = useState<string | null>(null);
  const [typedHalf, setTypedHalf] = useState<string | null>(null);
  const [typedDay, setTypedDay] = useState<string | null>(null);
  // The version the admin started typing against; a newer one refuses the save once.
  const [editVersion, setEditVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const hourly = rateField(typedHourly, venue.startingPrice);
  const half = rateField(typedHalf, venue.halfDayPrice);
  const day = rateField(typedDay, venue.dayPassPrice);
  const isDirty = hourly.isEdited || half.isEdited || day.isEdited;
  const planCount = Object.values(venue.membershipPrices).reduce(
    (count, row) => count + Object.values(row ?? {}).filter((price) => typeof price === "number").length,
    0,
  );

  const type = (set: (value: string) => void, value: string) => {
    set(value.replace(/\D/g, ""));
    setEditVersion((current) => current ?? venue.version);
  };

  const handleSave = async () => {
    const invalid = rateError(hourly.value, half.value, day.value);
    if (invalid) {
      setError(invalid);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await patchVenueRow(venue.slug, {
        startingPrice: hourly.value,
        halfDayPrice: half.value,
        dayPassPrice: day.value,
        version: editVersion ?? venue.version,
      });
      await onSaved();
      setTypedHourly(null);
      setTypedHalf(null);
      setTypedDay(null);
      setEditVersion(null);
      toastDone(`${venue.name} rates saved.`);
    } catch (caught) {
      const info = readApiError(caught);
      if (info.code === "STALE_EDIT") {
        setEditVersion(null);
        void onSaved();
        setError("This venue changed since you started typing. Check the rates, then save again.");
      } else {
        setError(info.fields.dayPassPrice ?? info.fields.startingPrice ?? info.fields.halfDayPrice ?? info.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <tr>
      <th scope="row" className="px-5 py-3.5 text-left font-medium text-tertiary">
        {venue.name}
        <span className="block text-xs font-normal text-tertiary/55">{venue.locality}</span>
      </th>
      <td className="px-5 py-3.5">
        <label className="sr-only" htmlFor={`hourly-${venue.slug}`}>
          {venue.name} hourly rate
        </label>
        <input
          id={`hourly-${venue.slug}`}
          inputMode="numeric"
          placeholder="Not sold"
          value={hourly.text}
          onChange={(event) => type(setTypedHourly, event.target.value)}
          className={cn(INPUT, error ? "border-primary" : "border-tertiary/20")}
        />
      </td>
      <td className="px-5 py-3.5">
        <label className="sr-only" htmlFor={`half-${venue.slug}`}>
          {venue.name} half day rate
        </label>
        <input
          id={`half-${venue.slug}`}
          inputMode="numeric"
          placeholder="Not sold"
          value={half.text}
          onChange={(event) => type(setTypedHalf, event.target.value)}
          className={cn(INPUT, error ? "border-primary" : "border-tertiary/20")}
        />
      </td>
      <td className="px-5 py-3.5">
        <label className="sr-only" htmlFor={`day-${venue.slug}`}>
          {venue.name} day pass rate
        </label>
        <input
          id={`day-${venue.slug}`}
          inputMode="numeric"
          placeholder="Not sold"
          value={day.text}
          onChange={(event) => type(setTypedDay, event.target.value)}
          className={cn(INPUT, error ? "border-primary" : "border-tertiary/20")}
        />
      </td>
      <td className="px-5 py-3.5">
        <Link
          href={`/admin/venues/${venue.slug}`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {planCount ? `${planCount} ${planCount === 1 ? "price" : "prices"} set` : "Set plan prices"}
        </Link>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-3">
          {error && (
            <span role="alert" className="text-xs text-primary">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="rounded-lg border border-tertiary/20 px-3.5 py-1.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5 disabled:opacity-40"
          >
            {isSaving ? "Saving..." : "Save"}
            <span className="sr-only"> {venue.name} rates</span>
          </button>
        </div>
      </td>
    </tr>
  );
};

const AdminPricingPage = () => {
  const { venues, error, isLoading, refresh } = useAdminVenues();

  if (isLoading) return <Skeleton />;

  return (
    <>
      <PageHeader
        title="Pricing"
        description="Set each venue's own hourly, half day and day pass prices. Leave a box empty if the venue doesn't sell that pass. Venues can also set their prices from the partner panel."
      />

      <div className={`${CARD} mt-6 overflow-x-auto shadow-lg shadow-tertiary/5`}>
        {error ? (
          <p role="alert" className="px-6 py-14 text-center text-sm text-primary">
            We couldn&apos;t load the venues. Refresh to try again.
          </p>
        ) : (
          <table className="w-full min-w-3xl text-sm">
            <thead className="border-b border-tertiary/10 text-left text-xs uppercase tracking-wider text-tertiary/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Venue</th>
                <th scope="col" className="px-5 py-3 font-semibold">Hourly (₹)</th>
                <th scope="col" className="px-5 py-3 font-semibold">Half day (₹)</th>
                <th scope="col" className="px-5 py-3 font-semibold">Day pass (₹)</th>
                <th scope="col" className="px-5 py-3 font-semibold">Memberships</th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  <span className="sr-only">Save</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/8">
              {venues.map((venue) => (
                <PriceRow key={venue.slug} venue={venue} onSaved={refresh} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-tertiary/55">
        New rates apply to bookings made from now on. Existing bookings and memberships keep the
        price that was paid.
      </p>
    </>
  );
};

export default AdminPricingPage;
