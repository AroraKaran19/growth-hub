"use client";

import { useState } from "react";
import { patchVenueRow, useAdminVenues } from "@/hooks/useAdminCatalogue";
import { readApiError } from "@/libs/api/errors";
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
  const [typedDay, setTypedDay] = useState<string | null>(null);
  // The version the admin started typing against; a newer one refuses the save once.
  const [editVersion, setEditVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hourly = rateField(typedHourly, venue.startingPrice);
  const day = rateField(typedDay, venue.dayPassPrice);
  const hourlyValue = hourly.value;
  const dayValue = day.value;
  const isDirty = hourly.isEdited || day.isEdited;
  const monthly = venue.membershipPrices.desk?.monthly;

  const type = (set: (value: string) => void, value: string) => {
    set(value.replace(/\D/g, ""));
    setEditVersion((current) => current ?? venue.version);
    setSaved(false);
  };

  const handleSave = async () => {
    const invalid = rateError(hourlyValue, dayValue);
    if (invalid) {
      setError(invalid);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await patchVenueRow(venue.slug, {
        startingPrice: hourlyValue,
        dayPassPrice: dayValue,
        version: editVersion ?? venue.version,
      });
      await onSaved();
      setTypedHourly(null);
      setTypedDay(null);
      setEditVersion(null);
      setSaved(true);
    } catch (caught) {
      const info = readApiError(caught);
      if (info.code === "STALE_EDIT") {
        setEditVersion(null);
        void onSaved();
        setError("This venue changed since you started typing. Check the rates, then save again.");
      } else {
        setError(info.fields.dayPassPrice ?? info.fields.startingPrice ?? info.message);
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
          value={hourly.text}
          onChange={(event) => type(setTypedHourly, event.target.value)}
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
          value={day.text}
          onChange={(event) => type(setTypedDay, event.target.value)}
          className={cn(INPUT, error ? "border-primary" : "border-tertiary/20")}
        />
      </td>
      <td className="px-5 py-3.5 text-tertiary/70">
        ₹{Math.round(dayValue * 0.6 || 0).toLocaleString("en-IN")}
      </td>
      <td className="px-5 py-3.5 text-tertiary/70">
        {monthly ? `₹${monthly.toLocaleString("en-IN")}` : "Not offered"}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-3">
          {error && (
            <span role="alert" className="text-xs text-primary">
              {error}
            </span>
          )}
          {saved && !isDirty && (
            <span role="status" className="text-xs text-green-700">
              Saved
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
        description="Set each venue's hourly and day pass rates. Half day is 60% of a day pass. Membership prices are set on each venue's own page."
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
                <th scope="col" className="px-5 py-3 font-semibold">Day pass (₹)</th>
                <th scope="col" className="px-5 py-3 font-semibold">Half day</th>
                <th scope="col" className="px-5 py-3 font-semibold">Desk, 1 month</th>
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
