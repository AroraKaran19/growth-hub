import { env } from "../config/env";
import {
  EMAIL_TEMPLATE_IDS,
  EVENT_PATHS,
  type MemberEvent,
  type NotificationTemplates,
  type StaffEvent,
} from "../constants/notifications";
import { Member, PartnerStaff, type MemberDoc } from "../models";
import { sendTemplateEmail, type EmailAttachment, type EmailVariables } from "./msg91.service";

export type NotifySettings = NotificationTemplates & {
  authKey: string | null;
  email: { domain: string; from: string; fromName: string } | null;
  siteUrl: string;
};

type Senders = { email: typeof sendTemplateEmail };
type Logger = Pick<Console, "error" | "warn">;
type Recipient = Pick<MemberDoc, "email" | "billingEmail"> & { name?: string | null };
type Variables = EmailVariables;

export const createNotifier = (
  settings: NotifySettings,
  senders: Senders = { email: sendTemplateEmail },
  log: Logger = console,
) => {
  // Every template can greet by name and carry a button, whatever the sender passed.
  const site = settings.siteUrl.replace(/\/+$/, "");
  const firstName = (name: unknown) => (typeof name === "string" ? name.trim().split(/\s+/)[0] : "");
  const withDefaults = (event: MemberEvent | StaffEvent, name: string | null | undefined, variables: Variables): Variables => ({
    link: `${site}${EVENT_PATHS[event]}`,
    ...variables,
    name: firstName(variables.name) || firstName(name) || "there",
  });

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
      const sent = await emailTo(event, email, withDefaults(event, recipient.name, variables), attachments);
      if (!sent) log.warn(`${event} not sent: MSG91 email isn't set up.`);
    },
    staff: async (event: StaffEvent, recipients: { email: string; name?: string | null }[], variables: Variables) => {
      const results = await Promise.all(recipients.map((to) => emailTo(event, to.email, withDefaults(event, to.name, variables))));
      if (recipients.length && !results.some(Boolean)) log.warn(`${event} not sent: MSG91 email isn't set up.`);
    },
  };
};

const fromEnv = () => {
  const { msg91AuthKey, email, frontendUrl } = env();
  return createNotifier({ authKey: msg91AuthKey, email, siteUrl: frontendUrl, emailTemplates: EMAIL_TEMPLATE_IDS });
};

/** Emails the member when they have an email. Never throws. */
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

/** Emails one address, for people without an account such as Contact form guests. Never throws. */
export const notifyAddress = async (event: MemberEvent, email: string, variables: Variables) => {
  try {
    await fromEnv().member(event, { email, billingEmail: null }, variables);
  } catch (error) {
    console.error(`${event} notification failed:`, error instanceof Error ? error.message : error);
  }
};

/** Emails every active staff account of the venue. Never throws. */
export const notifyVenueStaff = async (event: StaffEvent, venueSlug: string, variables: Variables) => {
  try {
    const staff = await PartnerStaff.find({ venueSlug, status: "active" }, { email: 1, name: 1 }).lean<{ email: string; name: string }[]>();
    await fromEnv().staff(event, staff, variables);
  } catch (error) {
    console.error(`${event} notification failed:`, error instanceof Error ? error.message : error);
  }
};
