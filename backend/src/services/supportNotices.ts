import { env } from "../config/env";
import { SUPPORT_STATUS_LABELS } from "../constants/support";
import { Member, type MemberDoc, type SupportRequestDoc } from "../models";
import { notifyAddress } from "./notify.service";

// The live account's email first; the copy kept on the request covers guests and deleted accounts.
const recipientOf = async (request: SupportRequestDoc) => {
  if (request.memberId) {
    const member = await Member.findById(request.memberId, { email: 1, billingEmail: 1 }).lean<Pick<MemberDoc, "email" | "billingEmail">>();
    const live = member?.email ?? member?.billingEmail;
    if (live) return live;
  }
  return request.contact.email;
};

/** Emails the customer about a reply or status change. Never throws. */
export const tellSupportUpdated = async (request: SupportRequestDoc, reply: string) => {
  try {
    const to = await recipientOf(request);
    if (!to) return;
    const { frontendUrl, isProduction, msg91AuthKey, email } = env();
    const site = frontendUrl.replace(/\/+$/, "");
    const variables = {
      name: request.contact.name,
      request_id: request.ref,
      subject: request.subject,
      status: SUPPORT_STATUS_LABELS[request.status],
      reply: reply || "There is no new message. Only the status of your request has changed.",
      ...(request.memberId
        ? {
            link: `${site}/account/support/${request.ref}`,
            action: "View request",
            follow_up: "If you would like to add anything, you can reply from the request page.",
          }
        : {
            link: `${site}/support`,
            action: "Visit the Help Center",
            follow_up: "If you would like to add anything, please write to hello@growthhubconnect.in, quoting your request ID.",
          }),
    };
    if (!msg91AuthKey || !email) {
      if (!isProduction) console.info(`MSG91 email isn't set up, so nothing was sent. Would email ${to}:`, variables);
      return;
    }
    await notifyAddress("SUPPORT_UPDATED", to, variables);
  } catch (error) {
    console.error("SUPPORT_UPDATED notification failed:", error instanceof Error ? error.message : error);
  }
};
