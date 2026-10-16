import type { MembershipDoc } from "../models";
import { dateLabel } from "../utils/indiaTime";
import { siteLink } from "../utils/siteLink";
import { notifyMember } from "./notify.service";

export const tellWelcome = (memberId: unknown) =>
  notifyMember("WELCOME", memberId, {
    memberships_link: siteLink("/memberships"),
    billing_link: siteLink("/account/billing"),
    help_link: siteLink("/support"),
  });

export const tellRenewalFailed = (membership: MembershipDoc) =>
  notifyMember("RENEWAL_FAILED", membership.memberId, {
    membership_id: membership.ref,
    venue: membership.venue.name,
    ...(membership.razorpay.shortUrl ? { link: membership.razorpay.shortUrl } : {}),
  });

export const tellMembershipLapsed = (membership: MembershipDoc) =>
  notifyMember("MEMBERSHIP_LAPSED", membership.memberId, {
    membership_id: membership.ref,
    venue: membership.venue.name,
    ends: dateLabel(membership.paidThrough ?? membership.startDate),
  });
