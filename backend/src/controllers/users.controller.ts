import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { listUsers, updateCustomer } from "../services/users.service";
import { parseBody } from "../utils/validate";
import { listUsersQuerySchema, updateCustomerSchema } from "../validators/users";

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await listUsers(listUsersQuerySchema.parse(req.query)), "Users");
});

export const patchCustomer = asyncHandler(async (req: Request, res: Response) => {
  const change = parseBody(updateCustomerSchema, req.body);
  sendSuccessResponse(res, await updateCustomer(String(req.params.id), change), "Customer updated");
});
