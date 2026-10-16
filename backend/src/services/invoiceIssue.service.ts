import type { ClientSession, Types } from "mongoose";
import { gstStateName } from "../constants/gstStates";
import { InvoiceJob, Member, type BilledTo, type BillingDetails, type InvoiceSourceKind, type MemberDoc } from "../models";
import { nextInvoiceNumber } from "./invoiceNumber.service";

const billedToFrom = (member: MemberDoc, company: BillingDetails | null): BilledTo => {
  const state = company?.state ?? null;
  return {
    name: member.name ?? null,
    companyName: company?.companyName ?? null,
    gstin: company?.gstin ?? null,
    address: company?.address ?? null,
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
  company: BillingDetails | null = null,
) => {
  const invoiceNumber = await nextInvoiceNumber(date, session);
  const member = await Member.findById(memberId).session(session).lean<MemberDoc>();
  const billedTo = member ? billedToFrom(member, company) : undefined;
  await InvoiceJob.create([{ source: { kind, id }, memberId, invoiceNumber, billedTo, sendsConfirmation: true }], { session });
  return invoiceNumber;
};
