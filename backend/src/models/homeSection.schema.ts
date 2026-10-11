import { Schema, model, type Types } from "mongoose";

/** One edited landing page section; a section with no row shows the site's built-in copy. */
export interface HomeSectionDoc {
  _id: Types.ObjectId;
  section: string;
  value: Record<string, unknown>;
  updatedBy: { id: string; name: string };
  updatedAt: Date;
}

const homeSectionSchema = new Schema<HomeSectionDoc>(
  {
    section: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: new Schema({ id: String, name: String }, { _id: false }), required: true },
  },
  { timestamps: true, minimize: false },
);

export const HomeSection = model<HomeSectionDoc>("HomeSection", homeSectionSchema, "home_sections");
