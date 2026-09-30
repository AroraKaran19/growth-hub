import { Schema, model, type Types } from "mongoose";
import { ADDON_UNITS, type AddonUnit } from "../constants/catalogue";

export interface AddonTypeDoc {
  _id: Types.ObjectId;
  key: string;
  name: string;
  description: string;
  unit: AddonUnit;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const addonTypeSchema = new Schema<AddonTypeDoc>(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    unit: { type: String, enum: [...ADDON_UNITS], required: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const AddonType = model<AddonTypeDoc>("AddonType", addonTypeSchema, "addon_types");
