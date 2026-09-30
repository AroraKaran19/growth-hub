import { Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import { Admin, PartnerStaff, type AdminDoc } from "../models";
import type { AccountStatus } from "../types/auth";
import type { InviteAdminInput, UpdateAdminInput } from "../validators/team";
import { adminSummary, type AdminAccount } from "./account.service";
import { lastActiveAt, revokeAccountSessions } from "./session.service";
import { hashPassword } from "./staffAuth.service";

export type TeamMember = Pick<AdminAccount, "id" | "name" | "email" | "role" | "permissions"> & {
  status: AccountStatus;
  lastActiveAt: string | null;
};

const toMember = (admin: AdminDoc, seen: Date | undefined): TeamMember => {
  const { id, name, email, role, permissions } = adminSummary(admin);
  return { id, name, email, role, permissions, status: admin.status, lastActiveAt: seen?.toISOString() ?? null };
};

const notFound = () => new AppError("That admin no longer exists.", 404, "ADMIN_NOT_FOUND");
const emailTaken = () => new AppError("That email already has a Growth Hub account.", 409, "EMAIL_TAKEN");

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

export const listTeam = async (): Promise<TeamMember[]> => {
  const admins = await Admin.find().sort({ createdAt: 1 }).lean<AdminDoc[]>();
  const activity = await lastActiveAt("admin", admins.map((admin) => admin._id));
  const members = admins.map((admin) => toMember(admin, activity.get(admin._id.toString())));
  return [
    ...members.filter((member) => member.role === "super-admin"),
    ...members.filter((member) => member.role !== "super-admin"),
  ];
};

export const inviteAdmin = async (input: InviteAdminInput, invitedById: string): Promise<TeamMember> => {
  const [admin, partner] = await Promise.all([
    Admin.exists({ email: input.email }),
    PartnerStaff.exists({ email: input.email }),
  ]);
  if (admin || partner) throw emailTaken();

  try {
    const created = await Admin.create({
      name: input.name,
      email: input.email,
      role: "admin",
      permissions: input.permissions,
      passwordHash: await hashPassword(input.temporaryPassword),
      mustChangePassword: true,
      invitedBy: new Types.ObjectId(invitedById),
    });
    return toMember(created.toObject(), undefined);
  } catch (error) {
    if (isDuplicateKey(error)) throw emailTaken();
    throw error;
  }
};

export const updateAdmin = async (
  targetId: string,
  change: UpdateAdminInput,
  actorId: string,
): Promise<TeamMember> => {
  if (!Types.ObjectId.isValid(targetId)) throw notFound();
  if (targetId === actorId) throw new AppError("You can't change your own access.", 409, "SELF_CHANGE");

  const admin = await Admin.findById(targetId).lean<AdminDoc>();
  if (!admin) throw notFound();
  if (adminSummary(admin).role === "super-admin") {
    throw new AppError("Super admins can't be changed here.", 403, "SUPER_ADMIN_LOCKED");
  }

  const updated = await Admin.findByIdAndUpdate(
    admin._id,
    {
      $set: {
        ...(change.permissions && { permissions: change.permissions }),
        ...(change.status && { status: change.status }),
      },
    },
    { returnDocument: "after" },
  ).lean<AdminDoc>();
  if (!updated) throw notFound();

  if (change.status === "disabled" && admin.status !== "disabled") {
    await revokeAccountSessions("admin", admin._id, "disabled");
  }
  const activity = await lastActiveAt("admin", [updated._id]);
  return toMember(updated, activity.get(updated._id.toString()));
};

export const promoteLegacyAdmins = async () => {
  const result = await Admin.updateMany(
    { role: { $exists: false } },
    { $set: { role: "super-admin", permissions: [] } },
  );
  return result.modifiedCount;
};
