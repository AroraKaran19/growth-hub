import { Types, type ClientSession } from "mongoose";
import { AccountSnapshot, Member, type MemberDoc } from "../models";
import type { AccountType } from "../types/auth";

const SECRETS = ["passwordHash", "passwordResetHash", "passwordResetExpiresAt", "mustChangePassword"];

export const keepSnapshot = async (
  accountType: AccountType,
  doc: { _id: Types.ObjectId } & Record<string, unknown>,
  deletedBy: string,
  session: ClientSession,
) => {
  const kept = Object.fromEntries(Object.entries(doc).filter(([key]) => !SECRETS.includes(key)));
  await AccountSnapshot.create(
    [{ accountType, accountId: doc._id, doc: kept, deletedAt: new Date(), deletedBy: new Types.ObjectId(deletedBy) }],
    { session },
  );
};

/** Customers by id, deleted ones read from their snapshot. */
export const findMembers = async (ids: (Types.ObjectId | string)[]): Promise<MemberDoc[]> => {
  const wanted = [...new Set(ids.map(String))].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  if (wanted.length === 0) return [];
  const live = await Member.find({ _id: { $in: wanted } }).lean<MemberDoc[]>();
  const found = new Set(live.map((member) => member._id.toString()));
  const missing = wanted.filter((id) => !found.has(id.toString()));
  if (missing.length === 0) return live;
  const kept = await AccountSnapshot.find({ accountType: "member", accountId: { $in: missing } }).lean();
  return [...live, ...kept.map((snapshot) => ({ ...snapshot.doc, _id: snapshot.accountId }) as unknown as MemberDoc)];
};

export const findMember = async (id: Types.ObjectId | string) => (await findMembers([id]))[0] ?? null;

/** Ids of deleted customers whose kept details match, for searches over history. */
export const deletedMemberIdsMatching = async (filter: Record<string, unknown>) =>
  (
    await AccountSnapshot.find(
      { accountType: "member", ...Object.fromEntries(Object.entries(filter).map(([key, value]) => [`doc.${key}`, value])) },
      { accountId: 1 },
    ).lean()
  ).map((snapshot) => snapshot.accountId);
