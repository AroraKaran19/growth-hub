import type { HomeOverrides, Testimonial } from "@/types/homeContent";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
const REVALIDATE_SECONDS = 300;

type Envelope<T> = { data: T };

// Saves bust the "home" tag; an unreachable API falls back to the built-in copy.
const loadHome = async <T>(path: string, fallback: T): Promise<T> => {
  try {
    const response = await fetch(`${API_URL}${path}`, { next: { tags: ["home"], revalidate: REVALIDATE_SECONDS } });
    if (!response.ok) return fallback;
    return ((await response.json()) as Envelope<T>).data;
  } catch {
    return fallback;
  }
};

export const getHomeOverrides = async () => (await loadHome<{ sections: HomeOverrides }>("/site/home", { sections: {} })).sections;

export const getTestimonials = async () =>
  (await loadHome<{ testimonials: Testimonial[] }>("/site/testimonials", { testimonials: [] })).testimonials;
