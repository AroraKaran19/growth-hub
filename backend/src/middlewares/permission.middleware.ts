import type { NextFunction, Request, Response } from "express";
import type { AdminPermission } from "../constants/permissions";
import { canAccess, isSuperAdmin } from "../services/permissions";
import { AppError } from "./error.middleware";

export const requirePermission =
  (permission: AdminPermission) => (req: Request, _res: Response, next: NextFunction) => {
    const account = req.auth?.account;
    if (account && canAccess(account, permission)) {
      next();
      return;
    }
    next(new AppError("You don't have access to this section.", 403, "PERMISSION_DENIED", { permission }));
  };

export const requireSuperAdmin = (req: Request, _res: Response, next: NextFunction) => {
  const account = req.auth?.account;
  if (account && isSuperAdmin(account)) {
    next();
    return;
  }
  next(new AppError("Only a super admin can do that.", 403, "SUPER_ADMIN_ONLY"));
};
