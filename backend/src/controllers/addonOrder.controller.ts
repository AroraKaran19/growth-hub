import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import {
  confirmOrderFromBrowser,
  createAppOrder,
  createDeskOrder,
  extendOrderHold,
  listAdminOrders,
  listMemberOrders,
  releaseOrderHold,
  voidAsAdmin,
  voidDeskOrder,
} from "../services/addonOrder.service";
import { parseBody } from "../utils/validate";
import { appOrderSchema, deskOrderSchema } from "../validators/addonOrder";
import { confirmSchema, requestKeySchema } from "../validators/booking";
import { deskStaffOf } from "./checkIn.controller";

const memberOf = (req: Request) => req.auth!.accountId;
const refOf = (req: Request) => String(req.params.ref);

export const postAppOrder = asyncHandler(async (req: Request, res: Response) => {
  const requestKey = parseBody(requestKeySchema, req.header("idempotency-key") ?? "");
  const result = await createAppOrder(memberOf(req), refOf(req), parseBody(appOrderSchema, req.body), requestKey);
  sendSuccessResponse(res, result, "Add-on order created", 201);
});

export const getMemberOrders = asyncHandler(async (req: Request, res: Response) => {
  const membership = typeof req.query.membership === "string" ? req.query.membership : undefined;
  sendSuccessResponse(res, { orders: await listMemberOrders(memberOf(req), membership) }, "Add-on orders");
});

export const postOrderHold = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { order: await extendOrderHold(memberOf(req), refOf(req)) }, "Hold extended");
});

export const deleteOrderHold = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { order: await releaseOrderHold(memberOf(req), refOf(req)) }, "Hold released");
});

export const postOrderConfirm = asyncHandler(async (req: Request, res: Response) => {
  const order = await confirmOrderFromBrowser(memberOf(req), refOf(req), parseBody(confirmSchema, req.body));
  sendSuccessResponse(res, { order }, "Add-ons confirmed");
});

export const postDeskOrder = asyncHandler(async (req: Request, res: Response) => {
  const { addonKeys, ...target } = parseBody(deskOrderSchema, req.body);
  sendSuccessResponse(res, { order: await createDeskOrder(deskStaffOf(req), target, addonKeys) }, "Desk sale recorded", 201);
});

export const deleteDeskOrder = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { order: await voidDeskOrder(deskStaffOf(req), refOf(req)) }, "Desk sale voided");
});

export const getAdminOrders = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { orders: await listAdminOrders(req.query) }, "Add-on orders");
});

export const deleteAdminOrder = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { order: await voidAsAdmin(refOf(req)) }, "Desk sale voided");
});
