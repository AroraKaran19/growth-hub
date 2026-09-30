import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { inviteAdmin, listTeam, updateAdmin } from "../services/team.service";
import { parseBody } from "../utils/validate";
import { inviteAdminSchema, updateAdminSchema } from "../validators/team";

export const getTeam = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, { members: await listTeam() }, "Team");
});

export const postTeamMember = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(inviteAdminSchema, req.body);
  sendSuccessResponse(res, { member: await inviteAdmin(input, req.auth!.accountId) }, "Admin invited", 201);
});

export const patchTeamMember = asyncHandler(async (req: Request, res: Response) => {
  const change = parseBody(updateAdminSchema, req.body);
  const member = await updateAdmin(String(req.params.id), change, req.auth!.accountId);
  sendSuccessResponse(res, { member }, "Admin updated");
});
