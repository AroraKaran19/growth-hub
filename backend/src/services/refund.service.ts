import { Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import { RefundDue, type Byline, type RefundDueDoc } from "../models";

export const toRefundView = (refund: RefundDueDoc) => ({
  id: refund._id.toString(),
  kind: refund.kind,
  ref: refund.ref,
  member: refund.member,
  venueName: refund.venueName,
  paid: refund.paid,
  suggested: refund.suggested,
  reason: refund.reason,
  status: refund.status,
  refundedAmount: refund.refundedAmount,
  refundNote: refund.refundNote,
  refundedAt: refund.refundedAt ? new Date(refund.refundedAt).toISOString() : null,
  refundedBy: refund.refundedBy?.name ?? null,
  createdAt: new Date(refund.createdAt).toISOString(),
});

export const listRefunds = async (status: "due" | "refunded") =>
  (await RefundDue.find({ status }).sort({ createdAt: status === "due" ? 1 : -1 }).limit(500).lean<RefundDueDoc[]>()).map(toRefundView);

export const markRefunded = async (id: string, input: { amount: number; note: string }, by: Byline) => {
  if (!Types.ObjectId.isValid(id)) throw new AppError("We couldn't find that refund.", 404, "REFUND_NOT_FOUND");
  const refund = await RefundDue.findById(id).lean<RefundDueDoc>();
  if (!refund) throw new AppError("We couldn't find that refund.", 404, "REFUND_NOT_FOUND");
  if (input.amount > refund.paid) {
    throw new AppError("The refund can't be more than the member paid.", 422, "REFUND_TOO_HIGH", { max: refund.paid });
  }
  const updated = await RefundDue.findOneAndUpdate(
    { _id: refund._id, status: "due" },
    { $set: { status: "refunded", refundedAmount: input.amount, refundNote: input.note, refundedAt: new Date(), refundedBy: by } },
    { returnDocument: "after" },
  ).lean<RefundDueDoc>();
  if (!updated) throw new AppError("This refund was already recorded.", 409, "REFUND_RECORDED");
  return toRefundView(updated);
};

/** What members see on a cancelled booking, plan or add-on order after its venue was removed. */
export const removalNotices = async (itemIds: Types.ObjectId[]) => {
  if (!itemIds.length) return new Map<string, { reason: string; amount: number | null; status: "due" | "refunded" }>();
  const refunds = await RefundDue.find({ itemId: { $in: itemIds } }).lean<RefundDueDoc[]>();
  return new Map(
    refunds.map((refund) => [
      refund.itemId.toString(),
      { reason: refund.reason, amount: refund.status === "refunded" ? refund.refundedAmount : refund.suggested, status: refund.status },
    ]),
  );
};
