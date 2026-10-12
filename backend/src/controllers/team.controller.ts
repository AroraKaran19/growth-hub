import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import type { AdminAccount } from "../services/account.service";
import { inviteAdmin, listTeam, updateAdmin } from "../services/team.service";
import { parseBody } from "../utils/validate";
import { inviteAdminSchema, updateAdminSchema } from "../validators/team";

const actorOf = (req: Request) => {
  const { id, role, permissions } = req.auth!.account as AdminAccount;
  return { id, role, permissions };
};

export const getTeam = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, { members: await listTeam() }, "Staff");
});

export const postTeamMember = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(inviteAdminSchema, req.body);
  sendSuccessResponse(res, { member: await inviteAdmin(input, actorOf(req)) }, "Admin invited", 201);
});

export const patchTeamMember = asyncHandler(async (req: Request, res: Response) => {
  const change = parseBody(updateAdminSchema, req.body);
  const member = await updateAdmin(String(req.params.id), change, actorOf(req));
  sendSuccessResponse(res, { member }, "Admin updated");
});
