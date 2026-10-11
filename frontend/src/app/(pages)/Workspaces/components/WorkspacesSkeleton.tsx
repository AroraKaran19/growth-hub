import VenueCardSkeleton from "@/app/components/ui/VenueCardSkeleton";

const FilterGroupSkeleton = ({ rows }: { rows: number }) => (
  <div className="flex flex-col gap-3">
    <div className="h-4 w-28 animate-pulse rounded bg-tertiary/10" />
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="flex items-center gap-2.5">
        <div className="size-4 animate-pulse rounded bg-tertiary/8" />
        <div className="h-3.5 animate-pulse rounded bg-tertiary/6" style={{ width: `${55 + ((index * 17) % 35)}%` }} />
      </div>
    ))}
  </div>
);

/** Matches WorkspaceBrowser's layout so nothing jumps when venues arrive. */
const WorkspacesSkeleton = () => (
  <div role="status" className="grid grid-cols-1 gap-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
    <span className="sr-only">Loading workspaces</span>
    <div aria-hidden="true" className="hidden flex-col gap-8 lg:flex">
      <div className="h-5 w-16 animate-pulse rounded bg-tertiary/10" />
      <FilterGroupSkeleton rows={4} />
      <FilterGroupSkeleton rows={4} />
      <FilterGroupSkeleton rows={6} />
    </div>
    <div className="min-w-0">
      <div aria-hidden="true" className="mb-6 h-4 w-44 animate-pulse rounded bg-tertiary/8" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <VenueCardSkeleton key={index} />
        ))}
      </div>
    </div>
  </div>
);

export default WorkspacesSkeleton;
