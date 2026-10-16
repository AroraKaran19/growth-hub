"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Trash2, TriangleAlert, X } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { readApiError } from "@/libs/api/errors";
import { deleteVenue, fetchDeletionImpact } from "@/libs/api/venueRemoval";
import { cn } from "@/utils";

const INPUT =
  "w-full rounded-lg border bg-secondary px-3 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary";

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const DeleteVenueModal = ({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) => {
  const router = useRouter();
  const { data: impact, error: impactError } = useSWR(["admin/venue-deletion", slug], () => fetchDeletionImpact(slug));
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
  const nameMatches = confirmName.trim().toLowerCase() === name.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tertiary/50 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-venue-title"
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-secondary shadow-2xl"
      >
        <div className="relative shrink-0 overflow-hidden bg-tertiary px-6 py-5 text-secondary">
          <div aria-hidden="true" className="absolute -right-12 -top-16 size-44 rounded-full bg-primary/40 blur-3xl" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-1 text-secondary/60 transition-colors hover:text-secondary"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <p className="relative flex items-center gap-2 text-sm text-secondary/70">
            <TriangleAlert aria-hidden="true" className="size-4 text-primary" />
            This can&apos;t be undone
          </p>
          <h2 id="delete-venue-title" className="relative mt-1 text-xl font-bold">
            Delete {name}?
          </h2>
          <p className="relative mt-1 text-sm text-secondary/70">
            The venue is removed for good and its seat map becomes free for another venue.
          </p>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-5 overflow-y-auto p-6">
          {impactError ? (
            <p role="alert" className="rounded-lg bg-primary/8 px-3 py-2 text-sm text-primary">
              {readApiError(impactError).message}
            </p>
          ) : !impact ? (
            <div className="h-28 animate-pulse rounded-xl bg-tertiary/5" />
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { label: "Bookings cancelled", value: String(impact.upcomingBookings) },
                  { label: "Memberships cancelled", value: String(impact.liveMemberships) },
                  { label: "Add-on orders cancelled", value: String(impact.futureAddonOrders) },
                  { label: "Partner logins turned off", value: String(impact.partnerLogins) },
                  { label: "Still owed to the venue", value: rupees(impact.owedToVenue) },
                ].map((item) => (
                  <li key={item.label} className="rounded-xl border border-tertiary/8 bg-surface px-3 py-2.5">
                    <span className="block text-lg font-bold text-tertiary">{item.value}</span>
                    <span className="text-xs text-tertiary/60">{item.label}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-tertiary/65">
                {affected > 0
                  ? "Everyone affected is emailed, and each refund appears under Payouts, Refunds to members. "
                  : ""}
                What the venue has already earned goes on a final draft statement under Payouts.
              </p>
            </>
          )}

          <div>
            <label htmlFor="delete-reason" className="mb-1.5 block text-sm font-medium text-tertiary">
              Reason
              <RequiredMark /> <span className="font-normal text-tertiary/50">(members see this)</span>
            </label>
            <textarea
              id="delete-reason"
              aria-required="true"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="For example: the venue has closed permanently"
              className={cn(INPUT, "resize-none", errors.reason ? "border-primary" : "border-tertiary/15")}
            />
            {errors.reason && <p className="mt-1 text-xs text-primary">{errors.reason}</p>}
          </div>
          <div>
            <label htmlFor="delete-confirm" className="mb-1.5 block text-sm font-medium text-tertiary">
              Type <span className="font-semibold">{name}</span> to confirm
              <RequiredMark />
            </label>
            <input
              id="delete-confirm"
              aria-required="true"
              autoComplete="off"
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              className={cn(INPUT, errors.confirmName ? "border-primary" : "border-tertiary/15")}
            />
            {errors.confirmName && <p className="mt-1 text-xs text-primary">{errors.confirmName}</p>}
          </div>
          {formError && (
            <p role="alert" className="rounded-lg bg-primary/8 px-3 py-2 text-sm text-primary">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-4">
            <button type="button" onClick={onClose} className="text-sm font-medium text-tertiary/70 hover:text-tertiary">
              Keep it
            </button>
            <button
              type="submit"
              disabled={isDeleting || !impact || !nameMatches}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {isDeleting ? "Deleting..." : "Delete venue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/** Super admins only: a quiet card on the page; the details and confirmation open in a modal. */
const DeleteVenueCard = ({ slug, name }: { slug: string; name: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-secondary p-5 shadow-sm">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-tertiary">
          <TriangleAlert aria-hidden="true" className="size-4 text-primary" />
          Delete this venue
        </h2>
        <p className="mt-1 text-sm text-tertiary/65">Removes it for good and frees its seat map for another venue.</p>
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Delete venue
      </button>
      {isOpen && <DeleteVenueModal slug={slug} name={name} onClose={() => setIsOpen(false)} />}
    </section>
  );
};

export default DeleteVenueCard;
