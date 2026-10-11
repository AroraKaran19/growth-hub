import type { ClientSession, Types } from "mongoose";
import { InvoiceJob, type InvoiceSourceKind } from "../models";
import { nextInvoiceNumber } from "./invoiceNumber.service";

/** Numbers the invoice and queues its PDF in the caller's transaction, so neither exists without the other. */
export const issueInvoice = async (
  kind: InvoiceSourceKind,
  id: Types.ObjectId,
  memberId: Types.ObjectId,
  date: string,
  session: ClientSession,
) => {
  const invoiceNumber = await nextInvoiceNumber(date, session);
  await InvoiceJob.create([{ source: { kind, id }, memberId, invoiceNumber }], { session });
  return invoiceNumber;
};
