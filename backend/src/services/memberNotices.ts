import type { MemberDoc, MembershipDoc } from "../models";
import { dateLabel } from "../utils/indiaTime";
import { siteLink } from "../utils/siteLink";
import { notifyMember } from "./notify.service";
import { phoneOf } from "./staffBookings.service";

export const tellWelcome = (member: MemberDoc) =>
  notifyMember("WELCOME", member._id, {
    email: member.email ?? "",
    phone: phoneOf(member),
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
