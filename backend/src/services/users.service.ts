import mongoose, { Types, type PipelineStage } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import { Member, Membership, Venue, type MemberDoc, type MembershipDoc, type VenueDoc } from "../models";
import type { AccountStatus, AccountType } from "../types/auth";
import { escapeRegex } from "../utils/regex";
import type { ListUsersQuery, UpdateCustomerInput, UserKind } from "../validators/users";
import { keepSnapshot } from "./accountSnapshot.service";
import { stopRenewalOf } from "./membership.service";
import { withLoginStatus } from "./partnerAccount.service";
import { lastActiveAt, revokeAccountSessions } from "./session.service";

export const USERS_PAGE_SIZE = 20;

export type UserRow = {
  id: string;
  kind: UserKind;
  name: string | null;
  email: string | null;
  phone: string | null;
  venueSlug: string | null;
  venueName: string | null;
  permissions: string[];
  status: AccountStatus;
  joinedAt: string;
  lastActiveAt: string | null;
  activeMemberships: number;
};

type RawRow = {
  _id: Types.ObjectId;
  kind: UserKind;
  name: string | null;
  email: string | null;
  phone: string | null;
  venueSlug: string | null;
  permissions: string[];
  status: AccountStatus;
  createdAt: Date;
};

const SHAPE = {
  name: { $ifNull: ["$name", null] },
  email: { $ifNull: ["$email", null] },
  status: { $ifNull: ["$status", "active"] },
  createdAt: 1,
};

// Admins saved before roles existed count as super admins, as everywhere else.
const UNION: PipelineStage[] = [
  { $project: { ...SHAPE, kind: { $literal: "customer" }, phone: "$phoneE164", venueSlug: { $literal: null }, permissions: { $literal: [] } } },
  {
    $unionWith: {
      coll: "partner_staff",
      pipeline: [{ $project: { ...SHAPE, kind: { $literal: "partner" }, phone: { $literal: null }, venueSlug: 1, permissions: { $literal: [] } } }],
    },
  },
  {
    $unionWith: {
      coll: "admins",
      pipeline: [
        {
          $project: {
            ...SHAPE,
            kind: { $ifNull: ["$role", "super-admin"] },
            phone: { $literal: null },
            venueSlug: { $literal: null },
            permissions: { $cond: [{ $eq: ["$role", "admin"] }, { $ifNull: ["$permissions", []] }, []] },
          },
        },
      ],
    },
  },
];

const searchStage = (q: string | undefined): PipelineStage[] => {
  if (!q) return [];
  const text = { $regex: escapeRegex(q), $options: "i" };
  const digits = q.replace(/\D/g, "");
  return [
    {
      $match: {
        $or: [{ name: text }, { email: text }, ...(digits.length >= 4 ? [{ phone: { $regex: escapeRegex(digits) } }] : [])],
      },
    },
  ];
};

const ACCOUNT_TYPE: Record<UserKind, AccountType> = { customer: "member", partner: "partner", admin: "admin", "super-admin": "admin" };

const renewingFilter = { status: { $in: ["active" as const, "past-due" as const] }, cancelAtCycleEnd: false };

const renewingCounts = async (memberIds: Types.ObjectId[]) => {
  if (memberIds.length === 0) return new Map<string, number>();
  const rows = await Membership.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { memberId: { $in: memberIds }, ...renewingFilter } },
    { $group: { _id: "$memberId", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.n]));
};

const toRows = async (raw: RawRow[]): Promise<UserRow[]> => {
  const idsOf = (type: AccountType) => raw.filter((row) => ACCOUNT_TYPE[row.kind] === type).map((row) => row._id);
  const slugs = [...new Set(raw.map((row) => row.venueSlug).filter((slug): slug is string => Boolean(slug)))];
  const [members, partners, admins, plans, venues] = await Promise.all([
    lastActiveAt("member", idsOf("member")),
    lastActiveAt("partner", idsOf("partner")),
    lastActiveAt("admin", idsOf("admin")),
    renewingCounts(idsOf("member")),
    Venue.find({ slug: { $in: slugs } }, { slug: 1, name: 1 }).lean<Pick<VenueDoc, "slug" | "name">[]>(),
  ]);
  const seen: Record<AccountType, Map<string, Date>> = { member: members, partner: partners, admin: admins };
  const venueNames = new Map(venues.map((venue) => [venue.slug, venue.name]));

  return raw.map((row) => {
    const id = row._id.toString();
    return {
      id,
      kind: row.kind,
      name: row.name,
      email: row.email,
      phone: row.phone,
      venueSlug: row.venueSlug,
      venueName: row.venueSlug ? (venueNames.get(row.venueSlug) ?? null) : null,
      permissions: row.permissions,
      status: row.status,
      joinedAt: row.createdAt.toISOString(),
      lastActiveAt: seen[ACCOUNT_TYPE[row.kind]].get(id)?.toISOString() ?? null,
      activeMemberships: plans.get(id) ?? 0,
    };
  });
};

export const listUsers = async ({ kind, status, q, page }: ListUsersQuery) => {
  const ofKind: PipelineStage[] = kind ? [{ $match: { kind } }] : [];
  const [result] = await Member.aggregate<{
    counts: { _id: UserKind; n: number }[];
    total: { n: number }[];
    rows: RawRow[];
  }>([
    ...UNION,
    ...(status ? [{ $match: { status } }] : []),
    ...searchStage(q),
    {
      $facet: {
        counts: [{ $group: { _id: "$kind", n: { $sum: 1 } } }],
        total: [...(ofKind as PipelineStage.FacetPipelineStage[]), { $count: "n" }],
        rows: [
          ...(ofKind as PipelineStage.FacetPipelineStage[]),
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (page - 1) * USERS_PAGE_SIZE },
          { $limit: USERS_PAGE_SIZE },
        ],
      },
    },
  ]);

  const counts: Record<UserKind, number> = { customer: 0, partner: 0, admin: 0, "super-admin": 0 };
  for (const row of result.counts) counts[row._id] = row.n;
  const [users, venues] = await Promise.all([
    toRows(result.rows),
    // For moving a partner login between venues while editing it here.
    Venue.find({}, { _id: 0, slug: 1, name: 1 }).sort({ name: 1 }).lean<Pick<VenueDoc, "slug" | "name">[]>(),
  ]);
  return {
    users,
    venues: await withLoginStatus(venues),
    counts,
    total: result.total[0]?.n ?? 0,
    page,
    pageSize: USERS_PAGE_SIZE,
  };
};

const notFound = () => new AppError("That customer no longer exists.", 404, "CUSTOMER_NOT_FOUND");

const stopEveryRenewal = async (memberId: Types.ObjectId) => {
  const plans = await Membership.find({ memberId, ...renewingFilter }).lean<MembershipDoc[]>();
  let stopped = 0;
  for (const plan of plans) {
    try {
      await stopRenewalOf(plan);
      stopped += 1;
    } catch (error) {
      if ((error as AppError).code !== "NOT_RENEWING") throw error;
    }
  }
  return stopped;
};

export const updateCustomer = async (id: string, change: UpdateCustomerInput) => {
  const member = Types.ObjectId.isValid(id) ? await Member.findById(id).lean<MemberDoc>() : null;
  if (!member) throw notFound();

  const updated = await Member.findByIdAndUpdate(
    member._id,
    {
      $set: {
        ...(change.name !== undefined && { name: change.name }),
        ...(change.email !== undefined && { email: change.email }),
        ...(change.status && { status: change.status }),
      },
    },
    { returnDocument: "after" },
  ).lean<MemberDoc>();
  if (!updated) throw notFound();

  let stoppedMemberships = 0;
  if (change.status === "disabled" && member.status !== "disabled") {
    await revokeAccountSessions("member", member._id, "disabled");
    stoppedMemberships = await stopEveryRenewal(member._id);
  }

  const [user] = await toRows([
    {
      _id: updated._id,
      kind: "customer",
      name: updated.name,
      email: updated.email,
      phone: updated.phoneE164,
      venueSlug: null,
      permissions: [],
      status: updated.status,
      createdAt: updated.createdAt,
    },
  ]);
  return { user, stoppedMemberships };
};

/** Removes the account; a snapshot keeps their bookings, invoices and payouts readable. */
export const deleteCustomer = async (id: string, deletedBy: string) => {
  const member = Types.ObjectId.isValid(id) ? await Member.findById(id).lean<MemberDoc>() : null;
  if (!member) throw notFound();
  await revokeAccountSessions("member", member._id, "disabled");
  const stoppedMemberships = await stopEveryRenewal(member._id);
  await mongoose.connection.transaction(async (session) => {
    await keepSnapshot("member", member as unknown as MemberDoc & Record<string, unknown>, deletedBy, session);
    await Member.deleteOne({ _id: member._id }, { session });
  });
  return { stoppedMemberships };
};
