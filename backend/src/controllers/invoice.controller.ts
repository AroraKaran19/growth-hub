import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { invoiceDownloadUrl, listInvoiceJobs, listMemberInvoices, retryInvoiceJob } from "../services/invoice.service";

export const getMyInvoices = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { invoices: await listMemberInvoices(req.auth!.accountId) }, "Invoices");
});

export const getInvoiceDownload = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { url: await invoiceDownloadUrl(req.auth!.accountId, String(req.params.id)) }, "Invoice link");
});

export const getAdminInvoices = asyncHandler(async (req: Request, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  sendSuccessResponse(res, { invoices: await listInvoiceJobs(status) }, "Invoices");
});

export const postInvoiceRetry = asyncHandler(async (req: Request, res: Response) => {
  await retryInvoiceJob(String(req.params.id));
  sendSuccessResponse(res, { queued: true }, "Invoice queued again");
});
