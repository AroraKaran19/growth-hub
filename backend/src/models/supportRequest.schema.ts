import { Schema, model, type Types } from "mongoose";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_RELATED_KINDS,
  SUPPORT_SOURCES,
  SUPPORT_STATUSES,
  type SupportCategory,
  type SupportRelatedKind,
  type SupportSource,
  type SupportStatus,
} from "../constants/support";

export const SUPPORT_EVENT_TYPES = ["created", "status", "reply", "follow-up"] as const;
export type SupportEventType = (typeof SUPPORT_EVENT_TYPES)[number];

export type SupportActor = { type: "member" | "guest" | "admin"; id: string | null; name: string };

export type SupportEvent = {
  type: SupportEventType;
  at: Date;
  by: SupportActor;
  message: string;
  from: SupportStatus | null;
  to: SupportStatus | null;
};

/** Kept on the request, so it still reads after the account is deleted. */
export type SupportContact = { name: string; email: string | null; phone: string | null };

export type SupportRelated = { kind: SupportRelatedKind; ref: string; venueName: string };

export interface SupportRequestDoc {
  _id: Types.ObjectId;
  ref: string;
  source: SupportSource;
  /** Null for a guest from the Contact form. */
  memberId: Types.ObjectId | null;
  contact: SupportContact;
  category: SupportCategory;
  subject: string;
  message: string;
  /** S3 keys; read URLs are built when the request is shown. */
  attachments: string[];
  related: SupportRelated | null;
  status: SupportStatus;
  events: SupportEvent[];
  /** The customer's oldest message without a Growth Hub reply after it. */
  awaitingReplySince: Date | null;
  /** Lowercased ref, name, email and phone digits, for the admin search. */
  searchText: string;
  createdAt: Date;
  updatedAt: Date;
}

const actorSchema = new Schema<SupportActor>(
  { type: { type: String, enum: ["member", "guest", "admin"], required: true }, id: { type: String, default: null }, name: String },
  { _id: false },
);

const eventSchema = new Schema<SupportEvent>(
  {
    type: { type: String, enum: [...SUPPORT_EVENT_TYPES], required: true },
    at: { type: Date, required: true },
    by: { type: actorSchema, required: true },
    message: { type: String, default: "" },
    from: { type: String, enum: [...SUPPORT_STATUSES, null], default: null },
    to: { type: String, enum: [...SUPPORT_STATUSES, null], default: null },
  },
  { _id: false },
);

const supportRequestSchema = new Schema<SupportRequestDoc>(
  {
    ref: { type: String, required: true, unique: true },
    source: { type: String, enum: [...SUPPORT_SOURCES], required: true },
    memberId: { type: Schema.Types.ObjectId, default: null },
    contact: {
      type: new Schema<SupportContact>(
        { name: { type: String, required: true }, email: { type: String, default: null }, phone: { type: String, default: null } },
        { _id: false },
      ),
      required: true,
    },
    category: { type: String, enum: [...SUPPORT_CATEGORIES], required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    attachments: { type: [String], default: [] },
    related: {
      type: new Schema<SupportRelated>(
        { kind: { type: String, enum: [...SUPPORT_RELATED_KINDS], required: true }, ref: String, venueName: String },
        { _id: false },
      ),
      default: null,
    },
    status: { type: String, enum: [...SUPPORT_STATUSES], required: true },
    events: { type: [eventSchema], default: [] },
    awaitingReplySince: { type: Date, default: null },
    searchText: { type: String, default: "" },
  },
  { timestamps: true },
);

supportRequestSchema.index({ memberId: 1, createdAt: -1 });
supportRequestSchema.index({ status: 1, createdAt: -1 });
supportRequestSchema.index({ status: 1, awaitingReplySince: 1 });

export const SupportRequest = model<SupportRequestDoc>("SupportRequest", supportRequestSchema, "support_requests");
