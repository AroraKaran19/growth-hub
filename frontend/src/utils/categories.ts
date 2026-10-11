import type { CatalogueLabels } from "@/types/catalogueLabels";
import type { WorkspaceCategory } from "@/types/category";

/** A workspace type with the admin's label, description and image applied. */
export const withOverrides = (category: WorkspaceCategory, labels: CatalogueLabels): WorkspaceCategory => {
  const details = labels.workspaceTypeDetails?.[category.slug];
  return {
    ...category,
    name: labels.workspaceTypes[category.slug] ?? category.name,
    description: details?.description ?? category.description,
    image: details?.image ?? category.image,
  };
};
