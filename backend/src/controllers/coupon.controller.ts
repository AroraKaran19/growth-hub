import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { setBookingCoupon } from "../services/booking.service";
import { addToWallet, createCoupon, listAdminCoupons, updateCoupon, walletFor } from "../services/coupon.service";
import { setMembershipCoupon } from "../services/membership.service";
import { parseBody } from "../utils/validate";
import { applyCouponSchema, createCouponSchema, patchCouponSchema, walletCodeSchema } from "../validators/coupon";

const bylineOf = (req: Request) => {
  const account = req.auth!.account;
  return { id: account.id, name: account.type === "admin" ? account.name : "" };
};

export const getAdminCoupons = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, { coupons: await listAdminCoupons() }, "Coupons");
});

export const postAdminCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await createCoupon(parseBody(createCouponSchema, req.body), bylineOf(req));
  sendSuccessResponse(res, { coupon }, "Coupon created", 201);
});

export const patchAdminCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await updateCoupon(String(req.params.id), parseBody(patchCouponSchema, req.body), bylineOf(req));
  sendSuccessResponse(res, { coupon }, "Coupon updated");
});

export const getWallet = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { coupons: await walletFor(req.auth!.accountId) }, "Wallet");
});

export const postWallet = asyncHandler(async (req: Request, res: Response) => {
  const { code } = parseBody(walletCodeSchema, req.body);
  sendSuccessResponse(res, { coupon: await addToWallet(req.auth!.accountId, code) }, "Coupon added", 201);
});

const refOf = (req: Request) => String(req.params.ref);
const codeOf = (req: Request) => parseBody(applyCouponSchema, req.body).code;

export const postBookingCoupon = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await setBookingCoupon(req.auth!.accountId, refOf(req), codeOf(req)), "Coupon applied");
});

export const deleteBookingCoupon = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await setBookingCoupon(req.auth!.accountId, refOf(req), null), "Coupon removed");
});

export const postMembershipCoupon = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await setMembershipCoupon(req.auth!.accountId, refOf(req), codeOf(req)), "Coupon applied");
});

export const deleteMembershipCoupon = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await setMembershipCoupon(req.auth!.accountId, refOf(req), null), "Coupon removed");
});
