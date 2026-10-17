import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import {
  customerInvoiceViewUrl,
  listCustomerBookings,
  listCustomerInvoices,
  listCustomerMemberships,
} from "../services/customerRecords.service";
import { deleteCustomer, listUsers, updateCustomer } from "../services/users.service";
import { parseBody } from "../utils/validate";
import { listUsersQuerySchema, recordsPageQuerySchema, updateCustomerSchema } from "../validators/users";

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await listUsers(listUsersQuerySchema.parse(req.query)), "Users");
});

export const patchCustomer = asyncHandler(async (req: Request, res: Response) => {
  const change = parseBody(updateCustomerSchema, req.body);
  sendSuccessResponse(res, await updateCustomer(String(req.params.id), change), "Customer updated");
});

export const removeCustomer = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await deleteCustomer(String(req.params.id), req.auth!.accountId), "Customer deleted");
});

const pageOf = (req: Request) => recordsPageQuerySchema.parse(req.query).page;

export const getCustomerBookings = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await listCustomerBookings(String(req.params.id), pageOf(req)), "Customer bookings");
});

export const getCustomerMemberships = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await listCustomerMemberships(String(req.params.id), pageOf(req)), "Customer memberships");
});

export const getCustomerInvoices = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await listCustomerInvoices(String(req.params.id), pageOf(req)), "Customer invoices");
});

export const viewCustomerInvoice = asyncHandler(async (req: Request, res: Response) => {
  const url = await customerInvoiceViewUrl(String(req.params.id), String(req.params.invoiceId));
  sendSuccessResponse(res, { url }, "Invoice link");
});
