/** The shape of a VenueCard while venues load. */
const VenueCardSkeleton = () => (
  <div aria-hidden="true" className="flex flex-col rounded-xl border border-tertiary/10 bg-secondary p-2">
    <div className="aspect-16/10 w-full animate-pulse rounded-lg bg-tertiary/8" />
    <div className="flex flex-col gap-3 px-1.5 pb-1.5 pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="h-3.5 w-36 animate-pulse rounded bg-tertiary/8" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-tertiary/8" />
      </div>
      <div className="h-5 w-48 animate-pulse rounded bg-tertiary/10" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-tertiary/6" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-tertiary/6" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="h-4 w-32 animate-pulse rounded bg-tertiary/8" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-tertiary/10" />
      </div>
    </div>
  </div>
);

export default VenueCardSkeleton;
