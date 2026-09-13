import type { WorkspaceType } from "./search";

export type WorkspaceCategory = {
  slug: WorkspaceType;
  name: string;
  description: string;
  image: string;
};
