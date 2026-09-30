import { Schema, model, type Types } from "mongoose";
import {
  CANCELLATION_REASONS,
  REQUEST_KINDS,
  REQUEST_STATUSES,
  type CancellationReason,
  type RequestKind,
  type RequestStatus,
} from "../constants/cancellation";

export type RequestDecider = { type: "partner" | "admin"; id: string; name: string };

export interface CancellationRequestDoc {
  _id: Types.ObjectId;
  kind: RequestKind;
  bookingId: Types.ObjectId | null;
  membershipId: Types.ObjectId | null;
  addonOrderId: Types.ObjectId | null;
  ref: string;
  venueId: Types.ObjectId;
  venueSlug: string;
  memberId: Types.ObjectId;
  reason: CancellationReason;
  details: string;
  status: RequestStatus;
  previousStatus: string;
  /** When the booking or plan starts; reschedules are blocked while a request is open. */
  startsAt: Date;
  /** Paise, set on approval. */
  refundAmount: number | null;
  decisionNote: string;
  decidedBy: RequestDecider | null;
  systemOpened: boolean;
  /** Held while a decision's gateway call runs, so a second decision can't slip in. */
  lockToken: string | null;
  lockedUntil: Date | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const deciderSchema = new Schema<RequestDecider>(
  { type: { type: String, enum: ["partner", "admin"] }, id: String, name: String },
  { _id: false },
);

const cancellationRequestSchema = new Schema<CancellationRequestDoc>(
  {
    kind: { type: String, enum: [...REQUEST_KINDS], required: true },
    bookingId: { type: Schema.Types.ObjectId, default: null },
    membershipId: { type: Schema.Types.ObjectId, default: null },
    addonOrderId: { type: Schema.Types.ObjectId, default: null },
    ref: { type: String, required: true },
    venueId: { type: Schema.Types.ObjectId, required: true },
    venueSlug: { type: String, required: true },
    memberId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: [...CANCELLATION_REASONS], required: true },
    details: { type: String, default: "" },
    status: { type: String, enum: [...REQUEST_STATUSES], required: true },
    previousStatus: { type: String, required: true },
    startsAt: { type: Date, required: true },
    refundAmount: { type: Number, default: null },
    decisionNote: { type: String, default: "" },
    decidedBy: { type: deciderSchema, default: null },
    systemOpened: { type: Boolean, default: false },
    lockToken: { type: String, default: null },
    lockedUntil: { type: Date, default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

cancellationRequestSchema.index(
  { bookingId: 1 },
  { unique: true, partialFilterExpression: { status: "open", bookingId: { $type: "objectId" } } },
);
cancellationRequestSchema.index(
  { membershipId: 1 },
  { unique: true, partialFilterExpression: { status: "open", membershipId: { $type: "objectId" } } },
);
cancellationRequestSchema.index(
  { addonOrderId: 1 },
  { unique: true, partialFilterExpression: { status: "open", addonOrderId: { $type: "objectId" } } },
);
cancellationRequestSchema.index({ venueSlug: 1, status: 1, createdAt: -1 });

export const CancellationRequest = model<CancellationRequestDoc>(
  "CancellationRequest",
  cancellationRequestSchema,
  "cancellation_requests",
);
