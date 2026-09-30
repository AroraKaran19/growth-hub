import type { ClientSession } from "mongoose";
import { Counter } from "../models";
import { financialYearOf } from "../utils/indiaTime";

/** "GH/2026-27/000123": sequential within each financial year. */
export const nextInvoiceNumber = async (date: string, session: ClientSession) => {
  const year = financialYearOf(date);
  const counter = await Counter.findOneAndUpdate(
    { _id: `invoice:${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session },
  ).lean();
  return `GH/${year}/${String(counter?.seq ?? 1).padStart(6, "0")}`;
};
