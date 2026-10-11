"use client";

import type { Amenity, AmenityInput } from "@/types/amenity";
import { adminApi } from "./client";

type Envelope<T> = { data: { data: T } };

const data = async <T>(request: Promise<unknown>) => ((await request) as Envelope<T>).data.data;

export const createAmenity = async (input: AmenityInput) => (await data<{ amenity: Amenity }>(adminApi.post("/admin/amenities", input))).amenity;

export const updateAmenity = async (id: string, input: AmenityInput) =>
  (await data<{ amenity: Amenity }>(adminApi.put(`/admin/amenities/${id}`, input))).amenity;

export const deleteAmenity = (id: string) => adminApi.delete(`/admin/amenities/${id}`);

export const reorderAmenities = async (ids: string[]) =>
  (await data<{ amenities: Amenity[] }>(adminApi.put("/admin/amenities/order", { ids }))).amenities;
