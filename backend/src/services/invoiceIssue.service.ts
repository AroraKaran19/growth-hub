import type { ClientSession, Types } from "mongoose";
import { gstStateName } from "../constants/gstStates";
import { InvoiceJob, Member, type BilledTo, type InvoiceSourceKind, type MemberDoc } from "../models";
import { nextInvoiceNumber } from "./invoiceNumber.service";

const billedToFrom = (member: MemberDoc): BilledTo => {
  const state = member.billing?.state ?? null;
  return {
    name: member.name ?? null,
    companyName: member.billing?.companyName ?? null,
    gstin: member.billing?.gstin ?? null,
    address: member.billing?.address ?? null,
    state: gstStateName(state),
    stateCode: state,
    email: member.billingEmail ?? member.email ?? null,
    phone: member.phoneE164 ?? null,
  };
};

/** Numbers the invoice and queues its PDF in the caller's transaction, so neither exists without the other. */
export const issueInvoice = async (
  kind: InvoiceSourceKind,
  id: Types.ObjectId,
  memberId: Types.ObjectId,
  date: string,
  session: ClientSession,
) => {
  const invoiceNumber = await nextInvoiceNumber(date, session);
  const member = await Member.findById(memberId).session(session).lean<MemberDoc>();
  const billedTo = member ? billedToFrom(member) : undefined;
  await InvoiceJob.create([{ source: { kind, id }, memberId, invoiceNumber, billedTo }], { session });
  return invoiceNumber;
};
