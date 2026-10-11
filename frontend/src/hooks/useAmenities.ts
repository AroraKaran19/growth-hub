"use client";

import useSWR from "swr";
import { adminApi, publicApi } from "@/libs/api/client";
import type { Amenity } from "@/types/amenity";

type Envelope = { data: { data: { amenities: Amenity[] } } };

/** Visible amenities, in the order admins set. */
export const useAmenities = () => {
  const { data, isLoading } = useSWR("catalogue/amenities", async () => ((await publicApi.get("/catalogue/amenities")) as Envelope).data.data.amenities, {
    revalidateOnFocus: false,
  });
  return { amenities: data ?? [], isLoading };
};

/** Every amenity, hidden ones included, for admin screens. */
export const useAdminAmenities = () => {
  const { data, error, isLoading, mutate } = useSWR("admin/amenities", async () => ((await adminApi.get("/admin/amenities")) as Envelope).data.data.amenities);
  return { amenities: data ?? [], error, isLoading, mutate };
};
