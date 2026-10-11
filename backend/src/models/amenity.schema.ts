import { Schema, model, type Types } from "mongoose";

export interface AmenityDoc {
  _id: Types.ObjectId;
  /** Stored on venues; fixed once created. */
  key: string;
  name: string;
  icon: string;
  description: string;
  visible: boolean;
  sortOrder: number;
}

const amenitySchema = new Schema<AmenityDoc>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    description: { type: String, default: "" },
    visible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

amenitySchema.index({ visible: 1, sortOrder: 1 });

export const Amenity = model<AmenityDoc>("Amenity", amenitySchema, "amenities");
