import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import {
  addAdjustment,
  exportStatement,
  generateStatements,
  getPartnerStatement,
  getStatement,
  issueStatement,
  listPartnerStatements,
  listPayouts,
  markStatementPaid,
  previousMonth,
  removeAdjustment,
  salesSummary,
  unissueStatement,
} from "../services/payout.service";
import { getPayoutAccount, setPayoutAccount } from "../services/payoutAccount.service";
import { parseBody } from "../utils/validate";
import { adjustmentSchema, generateSchema, markPaidSchema, monthSchema, payoutAccountSchema } from "../validators/payout";
import { indiaNow } from "../utils/indiaTime";
import { deskStaffOf } from "./checkIn.controller";

const bylineOf = (req: Request) => {
  const account = req.auth!.account;
  return { id: account.id, name: account.type === "admin" ? account.name : "" };
};
const idOf = (req: Request) => String(req.params.id);

const sendCsv = (res: Response, file: { filename: string; body: string }) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  res.send(file.body);
};

export const getPayouts = asyncHandler(async (req: Request, res: Response) => {
  const month = typeof req.query.month === "string" && req.query.month ? parseBody(monthSchema, req.query.month) : previousMonth();
  sendSuccessResponse(res, { month, venues: await listPayouts(month) }, "Payouts");
});

export const postGenerate = asyncHandler(async (req: Request, res: Response) => {
  const { month, venueSlug } = parseBody(generateSchema, req.body);
  sendSuccessResponse(res, { statements: await generateStatements(month, venueSlug) }, "Statements generated");
});

export const getPayoutStatement = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { statement: await getStatement(idOf(req)) }, "Statement");
});

export const postAdjustment = asyncHandler(async (req: Request, res: Response) => {
  const statement = await addAdjustment(idOf(req), parseBody(adjustmentSchema, req.body), bylineOf(req));
  sendSuccessResponse(res, { statement }, "Adjustment added");
});

export const deleteAdjustment = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { statement: await removeAdjustment(idOf(req), Number(req.params.index)) }, "Adjustment removed");
});

export const postIssue = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { statement: await issueStatement(idOf(req), bylineOf(req)) }, "Statement issued");
});

export const postUnissue = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { statement: await unissueStatement(idOf(req)) }, "Back to draft");
});

export const postMarkPaid = asyncHandler(async (req: Request, res: Response) => {
  const statement = await markStatementPaid(idOf(req), parseBody(markPaidSchema, req.body), bylineOf(req));
  sendSuccessResponse(res, { statement }, "Marked paid");
});

export const getStatementCsv = asyncHandler(async (req: Request, res: Response) => {
  sendCsv(res, await exportStatement(idOf(req)));
});

export const getVenuePayoutAccount = asyncHandler(async (req: Request, res: Response) => {
  const reveal = req.query.reveal === "true" ? { adminId: req.auth!.accountId } : null;
  sendSuccessResponse(res, { account: await getPayoutAccount(String(req.params.slug), reveal) }, "Bank details");
});

export const putVenuePayoutAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await setPayoutAccount(String(req.params.slug), parseBody(payoutAccountSchema, req.body), bylineOf(req));
  sendSuccessResponse(res, { account }, "Bank details saved");
});

export const getMyStatements = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { statements: await listPartnerStatements(deskStaffOf(req).venueSlug) }, "Statements");
});

export const getMyStatement = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { statement: await getPartnerStatement(deskStaffOf(req).venueSlug, idOf(req)) }, "Statement");
});

export const getMyStatementCsv = asyncHandler(async (req: Request, res: Response) => {
  sendCsv(res, await exportStatement(idOf(req), deskStaffOf(req).venueSlug));
});

export const getMyPayoutAccount = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { account: await getPayoutAccount(deskStaffOf(req).venueSlug) }, "Bank details");
});

export const getMySalesSummary = asyncHandler(async (req: Request, res: Response) => {
  const month = typeof req.query.month === "string" && req.query.month ? parseBody(monthSchema, req.query.month) : indiaNow().date.slice(0, 7);
  sendSuccessResponse(res, { summary: await salesSummary(deskStaffOf(req).venueSlug, month) }, "Sales summary");
});
