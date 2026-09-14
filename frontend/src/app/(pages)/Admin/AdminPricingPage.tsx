"use client";

import { useState } from "react";
import { useVenueCatalog, type CatalogVenue } from "@/stores/venues";
import { cn } from "@/utils";
import { rateFor } from "../Booking/pricing";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";

const INPUT =
  "w-24 rounded-lg border bg-secondary px-2.5 py-2 text-right text-sm text-tertiary outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const PriceRow = ({ venue }: { venue: CatalogVenue }) => {
  const catalog = useVenueCatalog();
  const [hourly, setHourly] = useState(String(venue.startingPrice));
  const [day, setDay] = useState(String(venue.dayPassPrice));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hourlyValue = Number(hourly);
  const dayValue = Number(day);
  const isDirty =
    hourlyValue !== venue.startingPrice || dayValue !== venue.dayPassPrice;

  const handleSave = () => {
    if (!(hourlyValue > 0) || !(dayValue > 0)) {
      setError("Both rates must be above ₹0.");
      return;
    }
    if (hourlyValue > dayValue) {
      setError("Day pass can't cost less than an hour.");
      return;
    }
    catalog.updateVenue(venue.slug, {
      startingPrice: hourlyValue,
      dayPassPrice: dayValue,
    });
    setError(null);
    setSaved(true);
  };

  const monthly = dayValue > 0 ? rateFor({ ...venue, dayPassPrice: dayValue }, "monthly").amount : 0;

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
          value={hourly}
          onChange={(event) => {
            setHourly(event.target.value.replace(/\D/g, ""));
            setSaved(false);
          }}
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
          value={day}
          onChange={(event) => {
            setDay(event.target.value.replace(/\D/g, ""));
            setSaved(false);
          }}
          className={cn(INPUT, error ? "border-primary" : "border-tertiary/20")}
        />
      </td>
      <td className="px-5 py-3.5 text-tertiary/70">
        ₹{Math.round(dayValue * 0.6 || 0).toLocaleString("en-IN")}
      </td>
      <td className="px-5 py-3.5 text-tertiary/70">
        ₹{monthly.toLocaleString("en-IN")}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-3">
          {error && <span role="alert" className="text-xs text-primary">{error}</span>}
          {saved && !isDirty && <span role="status" className="text-xs text-green-700">Saved</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className="rounded-lg border border-tertiary/20 px-3.5 py-1.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5 disabled:opacity-40"
          >
            Save
            <span className="sr-only"> {venue.name} rates</span>
          </button>
        </div>
      </td>
    </tr>
  );
};

const AdminPricingPage = () => {
  const catalog = useVenueCatalog();

  if (!catalog.isHydrated) return <Skeleton />;

  return (
    <>
      <PageHeader
        title="Pricing"
        description="Set each venue's hourly and day pass rates. Half day is 60% of a day pass; a month is 18 day passes, with 5% and 10% off 3 and 6 month plans."
      />

      <div className={`${CARD} mt-6 overflow-x-auto`}>
        <table className="w-full min-w-3xl text-sm">
          <thead className="border-b border-tertiary/10 text-left text-xs uppercase tracking-wider text-tertiary/50">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Venue</th>
              <th scope="col" className="px-5 py-3 font-semibold">Hourly (₹)</th>
              <th scope="col" className="px-5 py-3 font-semibold">Day pass (₹)</th>
              <th scope="col" className="px-5 py-3 font-semibold">Half day</th>
              <th scope="col" className="px-5 py-3 font-semibold">1 month</th>
              <th scope="col" className="px-5 py-3 font-semibold">
                <span className="sr-only">Save</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tertiary/8">
            {catalog.venues.map((venue) => (
              <PriceRow key={`${venue.slug}-${venue.startingPrice}-${venue.dayPassPrice}`} venue={venue} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-tertiary/55">
        New rates apply to bookings made from now on. Existing bookings and
        memberships keep the price that was paid.
      </p>
    </>
  );
};

export default AdminPricingPage;
