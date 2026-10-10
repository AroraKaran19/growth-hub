"use client";

import useSWR from "swr";
import { partnerApi, publicApi } from "@/libs/api/client";
import { useAuthStore } from "@/stores/auth";
import type { MembershipPriceTable } from "@/types/catalogue";
import type { PartnerVenue, Venue, VenueDetail } from "@/types/venue";

type Envelope<T> = { data: { data: T } };

/** One venue for signed-in screens that only know its address. */
export const useVenue = (slug: string | null | undefined) => {
  const { data, error, isLoading } = useSWR(slug ? ["venue", slug] : null, async ([, key]) =>
    ((await publicApi.get(`/venues/${key}`)) as Envelope<{ venue: VenueDetail }>).data.data.venue,
  );
  return { venue: data, error, isLoading };
};

export const usePublishedVenues = () => {
  const { data, error, isLoading } = useSWR("venues", async () =>
    ((await publicApi.get("/venues")) as Envelope<{ venues: Venue[] }>).data.data.venues,
  );
  return { venues: data ?? [], error, isLoading };
};

export type AddonPriceInput = { addonTypeId: string; price: number; enabled: boolean };

/** Rupees; null clears a price so that option is not sold. */
export type VenuePricesInput = {
  startingPrice: number | null;
  halfDayPrice: number | null;
  dayPassPrice: number | null;
  membershipPrices: MembershipPriceTable;
};

/** The signed-in partner's own venue. Keyed by account so a new sign-in never sees the last one's. */
export const usePartnerVenue = () => {
  const accountId = useAuthStore("partner", (state) => state.account?.id);
  const { data, error, isLoading, mutate } = useSWR(accountId ? ["partner/venue", accountId] : null, async () =>
    ((await partnerApi.get("/partner/venue")) as Envelope<{ venue: PartnerVenue }>).data.data.venue,
  );

  const saveAddons = async (addons: AddonPriceInput[]) => {
    const response = (await partnerApi.put("/partner/venue/addons", { addons })) as Envelope<{
      venue: PartnerVenue;
    }>;
    await mutate(response.data.data.venue, { revalidate: false });
  };

  const savePrices = async (prices: VenuePricesInput) => {
    const response = (await partnerApi.put("/partner/venue/prices", prices)) as Envelope<{ venue: PartnerVenue }>;
    await mutate(response.data.data.venue, { revalidate: false });
  };

  return { venue: data, error, isLoading, saveAddons, savePrices, refresh: () => mutate() };
};
