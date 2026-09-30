import { Types, type ClientSession } from "mongoose";
import { COUPON_CODE_PATTERN, type CouponReason, type OrderScope } from "../constants/coupons";
import { AppError } from "../middlewares/error.middleware";
import {
  Coupon,
  CouponRedemption,
  MemberCoupon,
  type CouponDoc,
  type MemberCouponDoc,
  type RedemptionKind,
} from "../models";
import { indiaNow } from "../utils/indiaTime";
import type { z } from "zod";
import type { createCouponSchema, patchCouponSchema } from "../validators/coupon";
import { couponFieldErrors, couponProblem } from "./couponRules";

type Byline = { id: string; name: string };

const REASON_MESSAGES: Record<CouponReason, string> = {
  unknown: "That code isn't valid.",
  inactive: "This coupon is no longer active.",
  "not-started": "This coupon isn't valid yet.",
  expired: "This coupon has expired.",
  scope: "This coupon doesn't apply to this booking.",
  "min-spend": "Spend a little more to use this coupon.",
  "member-limit": "You've already used this coupon.",
  "total-limit": "This coupon has been fully used.",
};

const invalid = (reason: CouponReason, meta: Record<string, unknown> = {}) =>
  new AppError(
    reason === "min-spend" && typeof meta.minSpend === "number"
      ? `Spend ₹${(meta.minSpend / 100).toLocaleString("en-IN")} or more to use this coupon.`
      : REASON_MESSAGES[reason],
    422,
    "COUPON_INVALID",
    { reason, ...meta },
  );

const notFound = () => new AppError("We couldn't find that coupon.", 404, "COUPON_NOT_FOUND");
const validationFailed = (fields: Record<string, string>) =>
  new AppError("Check the highlighted fields.", 400, "VALIDATION_FAILED", { fields });

export const toAdminCouponView = (coupon: CouponDoc) => ({
  id: coupon._id.toString(),
  code: coupon.code,
  title: coupon.title,
  description: coupon.description,
  kind: coupon.kind,
  value: coupon.value,
  maxDiscount: coupon.maxDiscount,
  minSpend: coupon.minSpend,
  appliesTo: coupon.appliesTo,
  startsOn: coupon.startsOn,
  endsOn: coupon.endsOn,
  perMemberLimit: coupon.perMemberLimit,
  totalLimit: coupon.totalLimit,
  visibility: coupon.visibility,
  active: coupon.active,
  redemptionCount: coupon.redemptionCount,
  createdAt: new Date(coupon.createdAt).toISOString(),
});

export const listAdminCoupons = async () =>
  (await Coupon.find().sort({ createdAt: -1 }).limit(500).lean<CouponDoc[]>()).map(toAdminCouponView);

export const createCoupon = async (input: z.infer<typeof createCouponSchema>, by: Byline) => {
  const fields = couponFieldErrors(input);
  if (Object.keys(fields).length) throw validationFailed(fields);
  try {
    const [created] = await Coupon.create([{ ...input, createdBy: by, updatedBy: by }]);
    return toAdminCouponView(created.toObject());
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new AppError("A coupon with that code already exists.", 409, "CODE_TAKEN");
    }
    throw error;
  }
};

export const updateCoupon = async (id: string, patch: z.infer<typeof patchCouponSchema>, by: Byline) => {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const coupon = await Coupon.findById(id).lean<CouponDoc>();
  if (!coupon) throw notFound();
  const fields = couponFieldErrors({ ...coupon, ...patch });
  if (Object.keys(fields).length) throw validationFailed(fields);
  const updated = await Coupon.findByIdAndUpdate(id, { ...patch, updatedBy: by }, { returnDocument: "after" }).lean<CouponDoc>();
  return toAdminCouponView(updated!);
};

const usesByCoupon = async (memberId: Types.ObjectId, couponIds: Types.ObjectId[]) => {
  const rows = await CouponRedemption.aggregate<{ _id: Types.ObjectId; uses: number }>([
    { $match: { memberId, couponId: { $in: couponIds } } },
    { $group: { _id: "$couponId", uses: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.uses]));
};

export type WalletState = "available" | "upcoming" | "used" | "expired" | "inactive";

const stateOf = (coupon: CouponDoc, uses: number, today: string): WalletState => {
  if (!coupon.active) return "inactive";
  if (today > coupon.endsOn) return "expired";
  if (uses >= coupon.perMemberLimit || (coupon.totalLimit !== null && coupon.redemptionCount >= coupon.totalLimit)) {
    return "used";
  }
  return today < coupon.startsOn ? "upcoming" : "available";
};

const toWalletView = (coupon: CouponDoc, uses: number, today: string) => ({
  code: coupon.code,
  title: coupon.title,
  description: coupon.description,
  kind: coupon.kind,
  value: coupon.value,
  maxDiscount: coupon.maxDiscount,
  minSpend: coupon.minSpend,
  appliesTo: coupon.appliesTo,
  startsOn: coupon.startsOn,
  endsOn: coupon.endsOn,
  state: stateOf(coupon, uses, today),
  usesLeft: Math.max(0, coupon.perMemberLimit - uses),
});

const ORDER: WalletState[] = ["available", "upcoming", "used", "expired", "inactive"];

/** Live public coupons plus every code-only coupon the member added. */
export const walletFor = async (memberId: string, today = indiaNow().date) => {
  if (!Types.ObjectId.isValid(memberId)) return [];
  const member = new Types.ObjectId(memberId);
  const added = (await MemberCoupon.find({ memberId: member }).lean<MemberCouponDoc[]>()).map((row) => row.couponId);
  const coupons = await Coupon.find({
    $or: [{ visibility: "public", active: true, endsOn: { $gte: today } }, { _id: { $in: added } }],
  }).lean<CouponDoc[]>();
  const uses = await usesByCoupon(member, coupons.map((coupon) => coupon._id));
  return coupons
    .map((coupon) => toWalletView(coupon, uses.get(coupon._id.toString()) ?? 0, today))
    .sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state) || a.endsOn.localeCompare(b.endsOn) || a.code.localeCompare(b.code));
};

const findByCode = async (input: string) => {
  const code = input.trim().toUpperCase();
  const coupon = COUPON_CODE_PATTERN.test(code) ? await Coupon.findOne({ code }).lean<CouponDoc>() : null;
  if (!coupon) throw invalid("unknown");
  return coupon;
};

export const addToWallet = async (memberId: string, input: string, today = indiaNow().date) => {
  const coupon = await findByCode(input);
  if (!coupon.active) throw invalid("inactive");
  if (today > coupon.endsOn) throw invalid("expired");
  const member = new Types.ObjectId(memberId);
  await MemberCoupon.updateOne(
    { memberId: member, couponId: coupon._id },
    { $setOnInsert: { addedAt: new Date() } },
    { upsert: true },
  );
  const uses = (await usesByCoupon(member, [coupon._id])).get(coupon._id.toString()) ?? 0;
  return toWalletView(coupon, uses, today);
};

/** The coupon and whether it fits this order; throws COUPON_INVALID with the reason. */
export const couponFor = async (
  memberId: string,
  input: string,
  order: { scope: OrderScope; subtotal: number },
  today = indiaNow().date,
) => {
  const coupon = await findByCode(input);
  const memberUses = await CouponRedemption.countDocuments({ couponId: coupon._id, memberId: new Types.ObjectId(memberId) });
  const problem = couponProblem(coupon, { today, memberUses, ...order });
  if (problem) throw invalid(problem, problem === "min-spend" ? { minSpend: coupon.minSpend } : {});
  return coupon;
};

/** Counted once per order, inside the confirming transaction. */
export const recordRedemption = async (
  input: { couponId: Types.ObjectId; memberId: Types.ObjectId; orderKind: RedemptionKind; orderId: Types.ObjectId; discount: number },
  session: ClientSession,
) => {
  const result = await CouponRedemption.updateOne(
    { couponId: input.couponId, orderKind: input.orderKind, orderId: input.orderId },
    { $setOnInsert: { memberId: input.memberId, discount: input.discount, redeemedAt: new Date() } },
    { upsert: true, session },
  );
  if (result.upsertedCount === 1) {
    await Coupon.updateOne({ _id: input.couponId }, { $inc: { redemptionCount: 1 } }, { session });
  }
};

/** Codes the member typed at checkout join their wallet. */
export const rememberCoupon = (memberId: Types.ObjectId, couponId: Types.ObjectId) =>
  MemberCoupon.updateOne({ memberId, couponId }, { $setOnInsert: { addedAt: new Date() } }, { upsert: true });
