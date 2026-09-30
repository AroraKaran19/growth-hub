import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { reportCsv, runReport } from "../services/report.service";
import { parseBody } from "../utils/validate";
import { reportNameSchema, reportRangeSchema } from "../validators/report";

const inputOf = (req: Request) => ({
  name: parseBody(reportNameSchema, req.params.report),
  range: parseBody(reportRangeSchema, req.query),
});

export const getReport = asyncHandler(async (req: Request, res: Response) => {
  const { name, range } = inputOf(req);
  sendSuccessResponse(res, { report: await runReport(name, range) }, "Report");
});

export const getReportCsv = asyncHandler(async (req: Request, res: Response) => {
  const { name, range } = inputOf(req);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${name}-${range.from}-to-${range.to}.csv"`);
  res.send(reportCsv(await runReport(name, range)));
});
