import type { Types } from "mongoose";
import {
  Admin,
  Member,
  PartnerStaff,
  type AdminDoc,
  type MemberDoc,
  type PartnerStaffDoc,
} from "../models";
import type { AccountStatus, AccountType } from "../types/auth";

export type MemberAccount = {
  id: string;
  type: "member";
  name: string | null;
  email: string | null;
  phone: { countryCode: string; number: string };
  needsOnboarding: boolean;
};

export type PartnerAccount = {
  id: string;
  type: "partner";
  name: string;
  email: string;
  venueSlug: string;
};

export type AdminAccount = { id: string; type: "admin"; name: string; email: string };

export type AccountSummary = MemberAccount | PartnerAccount | AdminAccount;

export type LoadedAccount = { status: AccountStatus; summary: AccountSummary };

export const memberSummary = (member: MemberDoc): MemberAccount => ({
  id: member._id.toString(),
  type: "member",
  name: member.name ?? null,
  email: member.email ?? null,
  phone: { countryCode: member.countryCode, number: member.phoneNumber },
  needsOnboarding: !member.name,
});

export const partnerSummary = (staff: PartnerStaffDoc): PartnerAccount => ({
  id: staff._id.toString(),
  type: "partner",
  name: staff.name,
  email: staff.email,
  venueSlug: staff.venueSlug,
});

export const adminSummary = (admin: AdminDoc): AdminAccount => ({
  id: admin._id.toString(),
  type: "admin",
  name: admin.name,
  email: admin.email,
});

type AccountId = Types.ObjectId | string;

const loaders: Record<AccountType, (id: AccountId) => Promise<LoadedAccount | null>> = {
  member: async (id) => {
    const doc = await Member.findById(id).lean<MemberDoc>();
    return doc ? { status: doc.status, summary: memberSummary(doc) } : null;
  },
  partner: async (id) => {
    const doc = await PartnerStaff.findById(id).lean<PartnerStaffDoc>();
    return doc ? { status: doc.status, summary: partnerSummary(doc) } : null;
  },
  admin: async (id) => {
    const doc = await Admin.findById(id).lean<AdminDoc>();
    return doc ? { status: doc.status, summary: adminSummary(doc) } : null;
  },
};

export const loadAccount = (accountType: AccountType, accountId: AccountId) =>
  loaders[accountType](accountId);
