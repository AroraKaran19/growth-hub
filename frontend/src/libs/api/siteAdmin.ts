"use client";

import type { HomeOverrides, HomeSectionKey, Testimonial } from "@/types/homeContent";
import { adminApi } from "./client";

type AdminEnvelope<T> = { data: { data: T } };

const adminData = async <T>(request: Promise<unknown>) => ((await request) as AdminEnvelope<T>).data.data;

export const fetchAdminHome = async () => (await adminData<{ sections: HomeOverrides }>(adminApi.get("/admin/site/home"))).sections;

export const saveHomeSection = async <K extends HomeSectionKey>(section: K, value: NonNullable<HomeOverrides[K]>) =>
  (await adminData<{ sections: HomeOverrides }>(adminApi.put(`/admin/site/home/${section}`, value))).sections;

export const resetHomeSection = async (section: HomeSectionKey) =>
  (await adminData<{ sections: HomeOverrides }>(adminApi.delete(`/admin/site/home/${section}`))).sections;

export type TestimonialInput = Omit<Testimonial, "id">;

export const fetchAdminTestimonials = async () =>
  (await adminData<{ testimonials: Testimonial[] }>(adminApi.get("/admin/testimonials"))).testimonials;

export const createTestimonial = async (input: TestimonialInput) =>
  (await adminData<{ testimonial: Testimonial }>(adminApi.post("/admin/testimonials", input))).testimonial;

export const updateTestimonial = async (id: string, input: TestimonialInput) =>
  (await adminData<{ testimonial: Testimonial }>(adminApi.put(`/admin/testimonials/${id}`, input))).testimonial;

export const deleteTestimonial = (id: string) => adminApi.delete(`/admin/testimonials/${id}`);

export const reorderTestimonials = async (ids: string[]) =>
  (await adminData<{ testimonials: Testimonial[] }>(adminApi.put("/admin/testimonials/order", { ids }))).testimonials;
