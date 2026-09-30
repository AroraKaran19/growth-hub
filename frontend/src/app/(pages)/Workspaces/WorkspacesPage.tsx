import { Suspense } from "react";
import { getPublishedVenues } from "@/libs/api/venues";
import { localityOptionsFrom } from "@/utils/venues";
import WorkspaceBrowser from "./components/WorkspaceBrowser";

const WorkspacesPage = async () => {
  const venues = await getPublishedVenues();

  return (
    // pt clears the fixed navbar, which takes no space in the flow.
    <section className="bg-secondary pb-20 pt-28 lg:pt-36">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-tertiary sm:text-4xl">
            Workspaces in Bangalore
          </h1>
          <p className="mt-3 text-sm text-tertiary/70 text-pretty">
            Browse coworking spaces from our partner venues. Filter by locality,
            workspace type, price and amenities, then book your slot or start a
            membership.
          </p>
        </div>

        <div className="mt-10 lg:mt-12">
          {/* useSearchParams needs a Suspense boundary or the production build
              fails on this statically rendered route. */}
          <Suspense
            fallback={
              <p className="text-sm text-tertiary/60">
                Loading workspaces...
              </p>
            }
          >
            <WorkspaceBrowser
              venues={venues}
              locations={localityOptionsFrom(venues)}
            />
          </Suspense>
        </div>
      </div>
    </section>
  );
};

export default WorkspacesPage;
