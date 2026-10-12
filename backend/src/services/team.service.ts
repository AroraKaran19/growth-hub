import mongoose, { Types } from "mongoose";
import type { AdminRole } from "../constants/permissions";
import { AppError } from "../middlewares/error.middleware";
import { Admin, PartnerStaff, type AdminDoc } from "../models";
import type { AccountStatus } from "../types/auth";
import type { InviteAdminInput, UpdateAdminInput } from "../validators/team";
import { adminSummary, type AdminAccount } from "./account.service";
import { lastActiveAt, revokeAccountSessions } from "./session.service";
import { hasPermission } from "./permissions";
import { hashPassword, requestPasswordReset } from "./staffAuth.service";
import { keepSnapshot } from "./accountSnapshot.service";
import { detailsUpdate, emailTaken, isDuplicateKey } from "./staffDetails";

export type TeamActor = { id: string; role: AdminRole; permissions: readonly string[] };

export type TeamMember = Pick<AdminAccount, "id" | "name" | "email" | "role" | "permissions"> & {
  status: AccountStatus;
  lastActiveAt: string | null;
};

const toMember = (admin: AdminDoc, seen: Date | undefined): TeamMember => {
  const { id, name, email, role, permissions } = adminSummary(admin);
  return { id, name, email, role, permissions, status: admin.status, lastActiveAt: seen?.toISOString() ?? null };
};

const notFound = () => new AppError("That admin no longer exists.", 404, "ADMIN_NOT_FOUND");
const cantGrant = () => new AppError("You can only give sections you have yourself.", 403, "PERMISSION_DENIED");
const superOnly = () => new AppError("Only a super admin can make someone a super admin.", 403, "SUPER_ADMIN_ONLY");
const needsSections = () =>
  new AppError("Check the highlighted fields.", 400, "VALIDATION_FAILED", { fields: { permissions: "Pick at least one section." } });

const beyondActor = (actor: TeamActor, permissions: readonly string[]) =>
  actor.role === "super-admin" ? [] : permissions.filter((permission) => !hasPermission(actor.permissions, permission));

export const listTeam = async (): Promise<TeamMember[]> => {
  const admins = await Admin.find().sort({ createdAt: 1 }).lean<AdminDoc[]>();
  const activity = await lastActiveAt("admin", admins.map((admin) => admin._id));
  const members = admins.map((admin) => toMember(admin, activity.get(admin._id.toString())));
  return [
    ...members.filter((member) => member.role === "super-admin"),
    ...members.filter((member) => member.role !== "super-admin"),
  ];
};

export const inviteAdmin = async (input: InviteAdminInput, actor: TeamActor): Promise<TeamMember> => {
  if (input.role === "super-admin" && actor.role !== "super-admin") throw superOnly();
  if (beyondActor(actor, input.permissions).length > 0) throw cantGrant();
  const [admin, partner] = await Promise.all([
    Admin.exists({ email: input.email }),
    PartnerStaff.exists({ email: input.email }),
  ]);
  if (admin || partner) throw emailTaken();

  try {
    const created = await Admin.create({
      name: input.name,
      email: input.email,
      role: input.role,
      permissions: input.permissions,
      passwordHash: await hashPassword(input.temporaryPassword),
      mustChangePassword: true,
      invitedBy: new Types.ObjectId(actor.id),
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
  actor: TeamActor,
): Promise<TeamMember> => {
  if (!Types.ObjectId.isValid(targetId)) throw notFound();
  if (targetId === actor.id) throw new AppError("You can't change your own access.", 409, "SELF_CHANGE");

  const admin = await Admin.findById(targetId).lean<AdminDoc>();
  if (!admin) throw notFound();
  const currentRole = adminSummary(admin).role;
  if (currentRole === "super-admin" && actor.role !== "super-admin") {
    throw new AppError("Only a super admin can change a super admin.", 403, "SUPER_ADMIN_LOCKED");
  }
  if (change.role && change.role !== currentRole && actor.role !== "super-admin") throw superOnly();

  const nextRole = change.role ?? currentRole;
  const losesSuper = currentRole === "super-admin" && (nextRole !== "super-admin" || change.status === "disabled");
  if (losesSuper) {
    const others = await Admin.countDocuments({ _id: { $ne: admin._id }, role: "super-admin", status: "active" });
    if (others === 0) throw new AppError("Keep at least one active super admin.", 409, "LAST_SUPER_ADMIN");
  }

  let permissions: string[] | undefined;
  if (nextRole === "super-admin") {
    permissions = [];
  } else if (currentRole === "super-admin") {
    if (!change.permissions) throw needsSections();
    if (beyondActor(actor, change.permissions).length > 0) throw cantGrant();
    permissions = change.permissions;
  } else if (change.permissions) {
    // Sections the actor can't give stay exactly as they were.
    const kept = beyondActor(actor, adminSummary(admin).permissions);
    if (beyondActor(actor, change.permissions).some((permission) => !kept.includes(permission))) throw cantGrant();
    permissions = [...new Set([...change.permissions, ...kept])];
  }

  const details = await detailsUpdate(admin, change);
  let updated: AdminDoc | null;
  try {
    updated = await Admin.findByIdAndUpdate(
      admin._id,
      {
        $set: {
          ...details.set,
          ...(permissions && { permissions }),
          ...(nextRole !== currentRole && { role: nextRole }),
          ...(change.status && { status: change.status }),
        },
      },
      { returnDocument: "after" },
    ).lean<AdminDoc>();
  } catch (error) {
    if (isDuplicateKey(error)) throw emailTaken();
    throw error;
  }
  if (!updated) throw notFound();

  if (change.status === "disabled" && admin.status !== "disabled") {
    await revokeAccountSessions("admin", admin._id, "disabled");
  } else if (details.signOut) {
    await revokeAccountSessions("admin", admin._id, "details-changed");
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

const loadReachable = async (targetId: string, actor: TeamActor) => {
  const admin = Types.ObjectId.isValid(targetId) ? await Admin.findById(targetId).lean<AdminDoc>() : null;
  if (!admin) throw notFound();
  if (adminSummary(admin).role === "super-admin" && actor.role !== "super-admin") {
    throw new AppError("Only a super admin can change a super admin.", 403, "SUPER_ADMIN_LOCKED");
  }
  return admin;
};

export const deleteAdmin = async (targetId: string, actor: TeamActor, deletedBy: string) => {
  if (targetId === actor.id) throw new AppError("You can't delete your own account.", 409, "SELF_CHANGE");
  const admin = await loadReachable(targetId, actor);
  if (adminSummary(admin).role === "super-admin") {
    const others = await Admin.countDocuments({ _id: { $ne: admin._id }, role: "super-admin", status: "active" });
    if (others === 0) throw new AppError("Keep at least one active super admin.", 409, "LAST_SUPER_ADMIN");
  }
  await revokeAccountSessions("admin", admin._id, "disabled");
  await mongoose.connection.transaction(async (session) => {
    await keepSnapshot("admin", admin as unknown as AdminDoc & Record<string, unknown>, deletedBy, session);
    await Admin.deleteOne({ _id: admin._id }, { session });
  });
};

export const sendAdminResetLink = async (targetId: string, actor: TeamActor) => {
  const admin = await loadReachable(targetId, actor);
  if (admin.status !== "active") throw new AppError("Enable this admin before sending a reset link.", 409, "ACCOUNT_DISABLED");
  return requestPasswordReset("admin", admin.email);
};
