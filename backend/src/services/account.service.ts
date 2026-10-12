import type { Types } from "mongoose";
import { isAdminPermission, type AdminPermission, type AdminRole } from "../constants/permissions";
import { PROFILE_FIELDS, type ProfileField } from "../constants/profile";
import {
  Admin,
  Member,
  PartnerStaff,
  type AdminDoc,
  type MemberBilling,
  type MemberDoc,
  type PartnerStaffDoc,
} from "../models";
import type { AccountStatus, AccountType } from "../types/auth";

export type MemberProfile = Record<ProfileField, string | null>;

export type MemberAccount = {
  id: string;
  type: "member";
  name: string | null;
  email: string | null;
  phone: { countryCode: string; number: string };
  needsOnboarding: boolean;
  createdAt: string | null;
  profile: MemberProfile;
  billing: MemberBilling;
};

export type PartnerAccount = {
  id: string;
  type: "partner";
  name: string;
  email: string;
  venueSlug: string;
};

export type AdminAccount = {
  id: string;
  type: "admin";
  name: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
};

export type AccountSummary = MemberAccount | PartnerAccount | AdminAccount;

export type LoadedAccount = { status: AccountStatus; summary: AccountSummary };

export const memberSummary = (member: MemberDoc): MemberAccount => ({
  id: member._id.toString(),
  type: "member",
  name: member.name ?? null,
  email: member.email ?? null,
  phone: { countryCode: member.countryCode, number: member.phoneNumber },
  needsOnboarding: !member.name || !member.email,
  createdAt: member.createdAt?.toISOString() ?? null,
  profile: Object.fromEntries(PROFILE_FIELDS.map((field) => [field, member[field] ?? null])) as MemberProfile,
  billing: {
    companyName: member.billing?.companyName ?? null,
    gstin: member.billing?.gstin ?? null,
    address: member.billing?.address ?? null,
    state: member.billing?.state ?? null,
  },
});

export const partnerSummary = (staff: PartnerStaffDoc): PartnerAccount => ({
  id: staff._id.toString(),
  type: "partner",
  name: staff.name,
  email: staff.email,
  venueSlug: staff.venueSlug,
});

export const adminSummary = (admin: AdminDoc): AdminAccount => {
  // Admins from before roles had full access; keep it until migrate-admin-roles runs.
  const role = admin.role ?? "super-admin";
  return {
    id: admin._id.toString(),
    type: "admin",
    name: admin.name,
    email: admin.email,
    role,
    permissions: role === "super-admin" ? [] : (admin.permissions ?? []).filter(isAdminPermission),
  };
};

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
