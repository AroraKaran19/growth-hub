import { Schema, model, type Types } from "mongoose";

export const LABEL_KINDS = ["workspace-type", "amenity"] as const;
export type LabelKind = (typeof LABEL_KINDS)[number];

/** Admin overrides for a fixed workspace type or amenity; an absent field keeps the built-in one. */
export interface CatalogueLabelDoc {
  _id: Types.ObjectId;
  kind: LabelKind;
  key: string;
  label?: string;
  /** Workspace types only. */
  description?: string;
  image?: string;
  updatedBy: { id: string; name: string };
  updatedAt: Date;
}

const catalogueLabelSchema = new Schema<CatalogueLabelDoc>(
  {
    kind: { type: String, enum: [...LABEL_KINDS], required: true },
    key: { type: String, required: true },
    label: { type: String },
    description: { type: String },
    image: { type: String },
    updatedBy: { type: new Schema({ id: String, name: String }, { _id: false }), required: true },
  },
  { timestamps: true },
);

catalogueLabelSchema.index({ kind: 1, key: 1 }, { unique: true });

export const CatalogueLabel = model<CatalogueLabelDoc>("CatalogueLabel", catalogueLabelSchema, "catalogue_labels");
