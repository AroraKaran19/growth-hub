"use client";

import useSWR from "swr";
import { publicApi } from "@/libs/api/client";
import { NO_LABELS, type CatalogueLabels } from "@/types/catalogueLabels";

const fetchLabels = async () =>
  ((await publicApi.get("/catalogue/labels")) as { data: { data: { labels: CatalogueLabels } } }).data.data.labels;

/** Admin-chosen names, falling back to the name each screen already uses. */
export const useCatalogueLabels = () => {
  const { data, mutate } = useSWR("catalogue/labels", fetchLabels, { revalidateOnFocus: false });
  const labels = data ?? NO_LABELS;
  return {
    labels,
    workspaceType: (key: string, fallback: string) => labels.workspaceTypes[key] ?? fallback,
    amenity: (key: string, fallback: string) => labels.amenities[key] ?? fallback,
    refresh: () => mutate(),
  };
};
