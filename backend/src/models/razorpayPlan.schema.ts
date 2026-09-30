import { Schema, model, type Types } from "mongoose";

export interface RazorpayPlanDoc {
  _id: Types.ObjectId;
  /** "<period>:<interval>:<amountPaise>", shared by every membership at that price. */
  key: string;
  planId: string;
}

const razorpayPlanSchema = new Schema<RazorpayPlanDoc>({
  key: { type: String, required: true, unique: true },
  planId: { type: String, required: true },
});

export const RazorpayPlan = model<RazorpayPlanDoc>("RazorpayPlan", razorpayPlanSchema, "razorpay_plans");
