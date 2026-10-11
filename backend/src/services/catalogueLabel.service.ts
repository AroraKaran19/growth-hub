import { AMENITY_IDS, WORKSPACE_TYPES } from "../constants/catalogue";
import { AppError } from "../middlewares/error.middleware";
import { CatalogueLabel, type CatalogueLabelDoc, type LabelKind } from "../models";

const KEYS: Record<LabelKind, readonly string[]> = { "workspace-type": WORKSPACE_TYPES, amenity: AMENITY_IDS };

/** Only the names admins changed; everything else keeps its built-in name on the site. */
export const listLabels = async () => {
  const rows = await CatalogueLabel.find().lean<CatalogueLabelDoc[]>();
  const pick = (kind: LabelKind) =>
    Object.fromEntries(rows.filter((row) => row.kind === kind && row.label).map((row) => [row.key, row.label!]));
  const details = rows
    .filter((row) => row.kind === "workspace-type" && (row.description || row.image))
    .map((row) => [row.key, { ...(row.description && { description: row.description }), ...(row.image && { image: row.image }) }]);
  return { workspaceTypes: pick("workspace-type"), amenities: pick("amenity"), workspaceTypeDetails: Object.fromEntries(details) };
};

type EntryInput = { kind: LabelKind; key: string; label: string; description?: string; image?: string };

/** Replaces the item's overrides; a blank field goes back to the built-in value. */
export const setLabel = async (input: EntryInput, by: { id: string; name: string }) => {
  if (!KEYS[input.kind].includes(input.key)) throw new AppError("That item doesn't exist.", 404, "LABEL_KEY_UNKNOWN");
  const isType = input.kind === "workspace-type";
  const fields = {
    label: input.label.trim(),
    description: isType ? (input.description ?? "").trim() : "",
    image: isType ? (input.image ?? "").trim() : "",
  };
  const set = Object.fromEntries(Object.entries(fields).filter(([, value]) => value));
  const unset = Object.fromEntries(Object.entries(fields).filter(([, value]) => !value).map(([key]) => [key, ""]));
  const filter = { kind: input.kind, key: input.key };
  if (!Object.keys(set).length) await CatalogueLabel.deleteOne(filter);
  else await CatalogueLabel.updateOne(filter, { $set: { ...set, updatedBy: by }, $unset: unset }, { upsert: true });
  return listLabels();
};
