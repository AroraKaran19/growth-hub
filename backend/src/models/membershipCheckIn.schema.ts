import { Schema, model, type Types } from "mongoose";

export interface MembershipCheckInDoc {
  _id: Types.ObjectId;
  membershipId: Types.ObjectId;
  venueSlug: string;
  /** India date; a member checks in at most once a day. */
  date: string;
  at: Date;
  by: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}

const membershipCheckInSchema = new Schema<MembershipCheckInDoc>(
  {
    membershipId: { type: Schema.Types.ObjectId, required: true },
    venueSlug: { type: String, required: true },
    date: { type: String, required: true },
    at: { type: Date, required: true },
    by: { type: new Schema({ id: String, name: String }, { _id: false }), required: true },
  },
  { timestamps: true },
);

membershipCheckInSchema.index({ membershipId: 1, date: 1 }, { unique: true });
membershipCheckInSchema.index({ venueSlug: 1, date: 1 });

export const MembershipCheckIn = model<MembershipCheckInDoc>(
  "MembershipCheckIn",
  membershipCheckInSchema,
  "membership_check_ins",
);
