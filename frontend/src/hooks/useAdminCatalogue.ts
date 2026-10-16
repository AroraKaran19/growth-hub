"use client";

import useSWR, { mutate as mutateCache } from "swr";
import { adminApi } from "@/libs/api/client";
import type {
  AddonTypeView,
  AddonUnit,
  AdminVenue,
  AdminVenueRow,
  OutageDuration,
  SeatMapDetail,
  SeatMapSummary,
  VenueStatsResponse,
} from "@/types/catalogue";

type Body = Record<string, unknown>;
type Versioned = Body & { version: number };

const VENUES_KEY = "admin/venues";
const venueKey = (slug: string) => ["admin/venue", slug] as const;

const data = async <T>(request: Promise<{ data: { data: T } }>) => (await request).data.data;

// Every venue change refreshes the list and replaces the cached detail.
const remember = async (venue: AdminVenue) => {
  await mutateCache(venueKey(venue.slug), venue, { revalidate: false });
  void mutateCache(VENUES_KEY);
  return venue;
};

export const createVenue = async (input: Body) =>
  remember((await data<{ venue: AdminVenue }>(adminApi.post("/admin/venues", input))).venue);

export const patchVenueRow = async (slug: string, patch: Versioned) =>
  remember((await data<{ venue: AdminVenue }>(adminApi.patch(`/admin/venues/${slug}`, patch))).venue);

export const useAdminVenues = () => {
  const { data: venues, error, isLoading, mutate } = useSWR(VENUES_KEY, async () =>
    (await data<{ venues: AdminVenueRow[] }>(adminApi.get("/admin/venues"))).venues,
  );
  return { venues: venues ?? [], error, isLoading, refresh: async () => void (await mutate()) };
};

export const useVenueStats = () => {
  const { data: stats, error, isLoading } = useSWR("admin/venue-stats", () =>
    data<VenueStatsResponse>(adminApi.get("/admin/venue-stats")),
  );
  return { stats, error, isLoading };
};

export const useAdminVenue = (slug: string | null) => {
  const { data: venue, error, isLoading, mutate } = useSWR(slug ? venueKey(slug) : null, async ([, key]) =>
    (await data<{ venue: AdminVenue }>(adminApi.get(`/admin/venues/${key}`))).venue,
  );
  const base = `/admin/venues/${slug}`;
  const act = async (request: Promise<{ data: { data: { venue: AdminVenue } } }>) =>
    remember((await data(request)).venue);

  return {
    venue,
    error,
    isLoading,
    refresh: () => void mutate(),
    save: (patch: Versioned) => act(adminApi.patch(base, patch)),
    assignMap: (seatMapId: string) => act(adminApi.put(`${base}/seat-map`, { seatMapId })),
    unassignMap: () => act(adminApi.delete(`${base}/seat-map`)),
    takeSeatOut: (seatId: string, duration: OutageDuration) => act(adminApi.post(`${base}/outages`, { seatId, duration })),
    endOutage: (seatId: string) => act(adminApi.delete(`${base}/outages/${encodeURIComponent(seatId)}`)),
  };
};

export const useSeatMaps = (status: "free" | "assigned" | "all") => {
  const { data: seatMaps, error, isLoading, mutate } = useSWR(["admin/seat-maps", status], async () =>
    (await data<{ seatMaps: SeatMapSummary[] }>(adminApi.get("/admin/seat-maps", { params: { status } })))
      .seatMaps,
  );
  return { seatMaps: seatMaps ?? [], error, isLoading, refresh: async () => void (await mutate()) };
};

export const fetchSeatMap = async (id: string) =>
  (await data<{ seatMap: SeatMapDetail }>(adminApi.get(`/admin/seat-maps/${id}`))).seatMap;

export type NewAddonType = { key: string; name: string; description: string; unit: AddonUnit; sortOrder: number };

export type AddonTypeChange = Partial<Pick<AddonTypeView, "name" | "description" | "active" | "sortOrder">>;

export const useAddonTypes = () => {
  const { data: addonTypes, error, isLoading, mutate } = useSWR("admin/addon-types", async () =>
    (await data<{ addonTypes: AddonTypeView[] }>(adminApi.get("/admin/addon-types"))).addonTypes,
  );

  const create = async (input: NewAddonType) => {
    await adminApi.post("/admin/addon-types", input);
    await mutate();
  };

  const update = async (id: string, change: AddonTypeChange) => {
    await adminApi.patch(`/admin/addon-types/${id}`, change);
    await mutate();
  };

  // The list is refetched even after a failure, so a half-applied move shows as it is.
  const reorder = async (changes: { id: string; sortOrder: number }[]) => {
    try {
      for (const change of changes) {
        await adminApi.patch(`/admin/addon-types/${change.id}`, { sortOrder: change.sortOrder });
      }
    } finally {
      await mutate();
    }
  };

  return { addonTypes: addonTypes ?? [], error, isLoading, create, update, reorder };
};
