import type { Request, Response } from "express";
import { SUPPORT_CATEGORIES, SUPPORT_STATUSES, type SupportCategory, type SupportStatus } from "../constants/support";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import {
  createGuestRequest,
  createMemberRequest,
  followUp,
  getAdmin,
  getMine,
  listAdmin,
  listMine,
  relatedOptions,
  updateAdmin,
} from "../services/support.service";
import { parseBody } from "../utils/validate";
import { adminUpdateSchema, createSupportSchema, followUpSchema, guestSupportSchema } from "../validators/support";

const MAX_QUERY = 100;

const refOf = (req: Request) => String(req.params.ref);

const queryOf = (req: Request, key: string) => (typeof req.query[key] === "string" ? (req.query[key] as string) : "");

const oneOf = <T extends string>(values: readonly T[], value: string) => (values as readonly string[]).includes(value) ? (value as T) : undefined;

export const postGuestSupport = asyncHandler(async (req: Request, res: Response) => {
  const created = await createGuestRequest(parseBody(guestSupportSchema, req.body));
  sendSuccessResponse(res, created, "Message received", 201);
});

export const getMySupport = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { requests: await listMine(req.auth!.accountId) }, "Support requests");
});

export const getSupportOptions = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { related: await relatedOptions(req.auth!.accountId) }, "Support options");
});

export const postSupport = asyncHandler(async (req: Request, res: Response) => {
  const request = await createMemberRequest(req.auth!.accountId, parseBody(createSupportSchema, req.body));
  sendSuccessResponse(res, { request }, "Request raised", 201);
});

export const getMySupportDetail = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { request: await getMine(req.auth!.accountId, refOf(req)) }, "Support request");
});

export const postFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const { message } = parseBody(followUpSchema, req.body);
  sendSuccessResponse(res, { request: await followUp(req.auth!.accountId, refOf(req), message) }, "Message added");
});

export const getAdminSupport = asyncHandler(async (req: Request, res: Response) => {
  const result = await listAdmin({
    status: oneOf<SupportStatus>(SUPPORT_STATUSES, queryOf(req, "status")),
    category: oneOf<SupportCategory>(SUPPORT_CATEGORIES, queryOf(req, "category")),
    q: queryOf(req, "q").slice(0, MAX_QUERY),
    waiting: queryOf(req, "waiting") === "1",
  });
  sendSuccessResponse(res, result, "Support requests");
});

export const getAdminSupportDetail = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { request: await getAdmin(refOf(req)) }, "Support request");
});

export const patchAdminSupport = asyncHandler(async (req: Request, res: Response) => {
  const account = req.auth!.account;
  const admin = { id: account.id, name: account.type === "admin" ? account.name : "" };
  const request = await updateAdmin(refOf(req), admin, parseBody(adminUpdateSchema, req.body));
  sendSuccessResponse(res, { request }, "Request updated");
});
