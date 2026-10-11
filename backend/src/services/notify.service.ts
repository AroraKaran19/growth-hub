import { env } from "../config/env";
import type { MemberEvent, NotificationTemplates, StaffEvent } from "../constants/notifications";
import { Member, PartnerStaff, type MemberDoc } from "../models";
import { sendTemplateEmail, type EmailAttachment } from "./msg91.service";

export type NotifySettings = NotificationTemplates & {
  authKey: string | null;
  email: { domain: string; from: string; fromName: string } | null;
};

type Senders = { email: typeof sendTemplateEmail };
type Logger = Pick<Console, "error" | "warn">;
type Recipient = Pick<MemberDoc, "email" | "billingEmail">;
type Variables = Record<string, string>;

export const createNotifier = (
  settings: NotifySettings,
  senders: Senders = { email: sendTemplateEmail },
  log: Logger = console,
) => {
  const emailTo = async (event: MemberEvent | StaffEvent, to: string, variables: Variables, attachments?: EmailAttachment[]) => {
    const templateId = settings.emailTemplates[event];
    if (!settings.authKey || !settings.email || !templateId) return false;
    try {
      const sender = { authKey: settings.authKey, templateId, ...settings.email };
      await (attachments ? senders.email(sender, to, variables, undefined, attachments) : senders.email(sender, to, variables));
    } catch (error) {
      log.error(`${event} email failed:`, error instanceof Error ? error.message : error);
    }
    return true;
  };

  return {
    member: async (event: MemberEvent, recipient: Recipient, variables: Variables, attachments?: EmailAttachment[]) => {
      const email = recipient.email ?? recipient.billingEmail;
      if (!email) {
        log.warn(`${event} not sent: the member has no email.`);
        return;
      }
      if (!(await emailTo(event, email, variables, attachments))) log.warn(`${event} not sent: no MSG91 template is set for it.`);
    },
    staff: async (event: StaffEvent, emails: string[], variables: Variables) => {
      const results = await Promise.all(emails.map((to) => emailTo(event, to, variables)));
      if (emails.length && !results.some(Boolean)) log.warn(`${event} not sent: no MSG91 template is set for it.`);
    },
  };
};

const fromEnv = () => {
  const { msg91AuthKey, email, notifications } = env();
  return createNotifier({
    authKey: msg91AuthKey,
    email: email && { domain: email.domain, from: email.from, fromName: email.fromName },
    ...notifications,
  });
};

/** Texts the member, and emails them when they have an email. Never throws. */
export const notifyMember = async (
  event: MemberEvent,
  memberId: unknown,
  variables: Variables,
  attachments?: EmailAttachment[],
) => {
  try {
    const member = await Member.findById(memberId).lean<MemberDoc>();
    if (member) await fromEnv().member(event, member, variables, attachments);
  } catch (error) {
    console.error(`${event} notification failed:`, error instanceof Error ? error.message : error);
  }
};

/** Emails every active staff account of the venue. Never throws. */
export const notifyVenueStaff = async (event: StaffEvent, venueSlug: string, variables: Variables) => {
  try {
    const staff = await PartnerStaff.find({ venueSlug, status: "active" }, { email: 1 }).lean<{ email: string }[]>();
    await fromEnv().staff(
      event,
      staff.map((item) => item.email),
      variables,
    );
  } catch (error) {
    console.error(`${event} notification failed:`, error instanceof Error ? error.message : error);
  }
};
