import { Schema, model, type Types } from "mongoose";
import {
  PRICE_UNITS,
  WORKSPACE_TYPES,
  type MembershipLength,
  type MembershipSpace,
  type PriceUnit,
  type WorkspaceType,
} from "../constants/catalogue";

export type Actor = { type: "admin" | "partner"; id: Types.ObjectId };

export type PayoutAccount = {
  accountName: string;
  accountNumberEnc: string;
  accountNumberLast4: string;
  ifsc: string;
  bankName: string;
  upiId: string | null;
  updatedBy: { id: string; name: string };
  updatedAt: Date;
};

export type VenueAddonPrice = { addonTypeId: Types.ObjectId; price: number; enabled: boolean };

export type MembershipPriceTable = Partial<Record<MembershipSpace, Partial<Record<MembershipLength, number>>>>;

export interface VenueDoc {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  locality: string;
  localityId: string;
  city: string;
  image: string;
  gallery: string[];
  rating: number;
  seatsAvailable: number;
  /** Rupees per hour; null when the venue doesn't sell hourly passes. Each price is set by a person, never derived. */
  startingPrice: number | null;
  priceUnit: PriceUnit;
  halfDayPrice: number | null;
  dayPassPrice: number | null;
  membershipPrices: MembershipPriceTable;
  distanceKm: number;
  description: string;
  longDescription: string;
  openDays: number[];
  opensAt: string;
  closesAt: string;
  openDaysLabel: string;
  hoursNote: string;
  googleMapsUrl: string;
  rules: string[];
  offer: { label: string; details: string } | null;
  workspaceTypes: WorkspaceType[];
  /** Keys from the amenities collection. */
  amenities: string[];
  addons: VenueAddonPrice[];
  published: boolean;
  outOfServiceSeatIds: string[];
  /** Where payouts go; the account number is sealed with PAYOUT_ENCRYPTION_KEY. */
  payoutAccount: PayoutAccount | null;
  createdBy: Actor | null;
  updatedBy: Actor | null;
  __v: number;
  createdAt: Date;
  updatedAt: Date;
}

const payoutAccountSchema = new Schema<PayoutAccount>(
  {
    accountName: String,
    accountNumberEnc: String,
    accountNumberLast4: String,
    ifsc: String,
    bankName: String,
    upiId: { type: String, default: null },
    updatedBy: { type: new Schema({ id: String, name: String }, { _id: false }) },
    updatedAt: Date,
  },
  { _id: false },
);

const actorSchema = new Schema<Actor>(
  {
    type: { type: String, enum: ["admin", "partner"], required: true },
    id: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false },
);

const addonPriceSchema = new Schema<VenueAddonPrice>(
  {
    addonTypeId: { type: Schema.Types.ObjectId, required: true },
    price: { type: Number, required: true },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const venueSchema = new Schema<VenueDoc>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    locality: { type: String, required: true, trim: true },
    localityId: { type: String, required: true },
    city: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    seatsAvailable: { type: Number, default: 0 },
    startingPrice: { type: Number, default: null },
    priceUnit: { type: String, enum: [...PRICE_UNITS], default: "hr" },
    halfDayPrice: { type: Number, default: null },
    dayPassPrice: { type: Number, default: null },
    membershipPrices: { type: Schema.Types.Mixed, default: {} },
    distanceKm: { type: Number, default: 0 },
    description: { type: String, default: "" },
    longDescription: { type: String, default: "" },
    openDays: { type: [Number], default: [] },
    opensAt: { type: String, default: "" },
    closesAt: { type: String, default: "" },
    openDaysLabel: { type: String, default: "" },
    hoursNote: { type: String, default: "" },
    googleMapsUrl: { type: String, default: "" },
    rules: { type: [String], default: [] },
    offer: { type: new Schema({ label: String, details: String }, { _id: false }), default: null },
    workspaceTypes: { type: [{ type: String, enum: [...WORKSPACE_TYPES] }], default: [] },
    amenities: { type: [String], default: [] },
    addons: { type: [addonPriceSchema], default: [] },
    published: { type: Boolean, default: false },
    outOfServiceSeatIds: { type: [String], default: [] },
    payoutAccount: { type: payoutAccountSchema, default: null },
    createdBy: { type: actorSchema, default: null },
    updatedBy: { type: actorSchema, default: null },
  },
  { timestamps: true, minimize: false },
);

venueSchema.index({ published: 1, localityId: 1 });

export const Venue = model<VenueDoc>("Venue", venueSchema, "venues");
