"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { TriangleAlert } from "lucide-react";
import { readApiError } from "@/libs/api/errors";
import { deleteVenue, fetchDeletionImpact } from "@/libs/api/venueRemoval";
import { cn } from "@/utils";

const INPUT =
  "w-full rounded-lg border bg-secondary px-3 py-2 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary";

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

/** Super admins only: removes the venue for good and lists the refunds its members are owed. */
const DeleteVenueCard = ({ slug, name }: { slug: string; name: string }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { data: impact, error: impactError } = useSWR(isOpen ? ["admin/venue-deletion", slug] : null, () => fetchDeletionImpact(slug));
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsDeleting(true);
    setErrors({});
    setFormError(null);
    try {
      await deleteVenue(slug, { reason: reason.trim(), confirmName: confirmName.trim() });
      router.push("/admin/venues");
    } catch (caught) {
      const info = readApiError(caught);
      setErrors(info.fields);
      if (!Object.keys(info.fields).length) setFormError(info.message);
      setIsDeleting(false);
    }
  };

  const affected = impact ? impact.upcomingBookings + impact.liveMemberships + impact.futureAddonOrders : 0;

  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/4 p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-tertiary">
        <TriangleAlert aria-hidden="true" className="size-4 text-primary" />
        Delete this venue
      </h2>
      <p className="mt-1 text-sm text-tertiary/65">
        Removes the venue for good and frees its seat map for another venue. This can&apos;t be undone.
      </p>

      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-4 rounded-lg border border-primary/40 bg-secondary px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/5"
        >
          Delete venue...
        </button>
      ) : (
        <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4">
          {impactError ? (
            <p role="alert" className="text-sm text-primary">{readApiError(impactError).message}</p>
          ) : !impact ? (
            <div className="h-24 animate-pulse rounded-xl bg-tertiary/5" />
          ) : (
            <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {[
                { label: "Upcoming bookings cancelled", value: impact.upcomingBookings },
                { label: "Memberships cancelled", value: impact.liveMemberships },
                { label: "Add-on orders cancelled", value: impact.futureAddonOrders },
                { label: "Partner logins disabled", value: impact.partnerLogins },
                { label: "Still owed to the venue", value: rupees(impact.owedToVenue) },
              ].map((item) => (
                <li key={item.label} className="rounded-xl bg-secondary px-3 py-2.5 shadow-sm">
                  <span className="block text-lg font-bold text-tertiary">{item.value}</span>
                  <span className="text-xs text-tertiary/60">{item.label}</span>
                </li>
              ))}
            </ul>
          )}
          {impact && (
            <p className="text-xs text-tertiary/65">
              {affected > 0
                ? "Each cancelled booking, plan and add-on order goes on the Refunds list under Payouts with your reason, and the member is emailed. "
                : ""}
              What the venue has already earned goes on a final draft statement under Payouts; deduct refunds there before issuing it.
            </p>
          )}

          <div>
            <label htmlFor="delete-reason" className="mb-1 block text-xs font-medium text-tertiary/70">
              Reason (members see this)
            </label>
            <textarea
              id="delete-reason"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="For example: the venue has closed permanently"
              className={cn(INPUT, "resize-none", errors.reason ? "border-primary" : "border-tertiary/15")}
            />
            {errors.reason && <p className="mt-1 text-xs text-primary">{errors.reason}</p>}
          </div>
          <div>
            <label htmlFor="delete-confirm" className="mb-1 block text-xs font-medium text-tertiary/70">
              Type <span className="font-semibold text-tertiary">{name}</span> to confirm
            </label>
            <input
              id="delete-confirm"
              autoComplete="off"
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              className={cn(INPUT, errors.confirmName ? "border-primary" : "border-tertiary/15")}
            />
            {errors.confirmName && <p className="mt-1 text-xs text-primary">{errors.confirmName}</p>}
          </div>
          {formError && <p role="alert" className="text-sm text-primary">{formError}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isDeleting || !impact || confirmName.trim().toLowerCase() !== name.toLowerCase()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete venue for good"}
            </button>
            <button type="button" onClick={() => setIsOpen(false)} className="text-sm font-medium text-tertiary/65 hover:text-tertiary">
              Keep it
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default DeleteVenueCard;
