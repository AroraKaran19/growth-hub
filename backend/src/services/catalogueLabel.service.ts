import { AMENITY_IDS, WORKSPACE_TYPES } from "../constants/catalogue";
import { AppError } from "../middlewares/error.middleware";
import { CatalogueLabel, type CatalogueLabelDoc, type LabelKind } from "../models";

const KEYS: Record<LabelKind, readonly string[]> = { "workspace-type": WORKSPACE_TYPES, amenity: AMENITY_IDS };

/** Only the names admins changed; everything else keeps its built-in name on the site. */
export const listLabels = async () => {
  const rows = await CatalogueLabel.find().lean<CatalogueLabelDoc[]>();
  const pick = (kind: LabelKind) => Object.fromEntries(rows.filter((row) => row.kind === kind).map((row) => [row.key, row.label]));
  return { workspaceTypes: pick("workspace-type"), amenities: pick("amenity") };
};

/** A blank label goes back to the built-in name. */
export const setLabel = async (input: { kind: LabelKind; key: string; label: string }, by: { id: string; name: string }) => {
  if (!KEYS[input.kind].includes(input.key)) throw new AppError("That item doesn't exist.", 404, "LABEL_KEY_UNKNOWN");
  const label = input.label.trim();
  if (!label) await CatalogueLabel.deleteOne({ kind: input.kind, key: input.key });
  else {
    await CatalogueLabel.updateOne({ kind: input.kind, key: input.key }, { $set: { label, updatedBy: by } }, { upsert: true });
  }
  return listLabels();
};
