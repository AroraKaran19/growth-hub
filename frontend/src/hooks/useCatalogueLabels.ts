"use client";

import useSWR from "swr";
import { publicApi } from "@/libs/api/client";
import { NO_LABELS, type CatalogueLabels } from "@/types/catalogueLabels";
import type { WorkspaceCategory } from "@/types/category";
import { withOverrides } from "@/utils/categories";

const fetchLabels = async () =>
  ((await publicApi.get("/catalogue/labels")) as { data: { data: { labels: CatalogueLabels } } }).data.data.labels;

/** Admin overrides, falling back to the values each screen already uses. */
export const useCatalogueLabels = () => {
  const { data, mutate } = useSWR("catalogue/labels", fetchLabels, { revalidateOnFocus: false });
  const labels = data ?? NO_LABELS;
  return {
    labels,
    workspaceType: (key: string, fallback: string) => labels.workspaceTypes[key] ?? fallback,
    category: (category: WorkspaceCategory) => withOverrides(category, labels),
    refresh: () => mutate(),
  };
};
