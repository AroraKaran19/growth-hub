/** Admin overrides for the fixed workspace types; a missing key keeps the built-in value. */
export type CatalogueLabels = {
  workspaceTypes: Record<string, string>;
  workspaceTypeDetails: Record<string, { description?: string; image?: string }>;
};

export const NO_LABELS: CatalogueLabels = { workspaceTypes: {}, workspaceTypeDetails: {} };
