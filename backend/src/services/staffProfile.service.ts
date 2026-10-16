import type { Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import { Admin, PartnerStaff } from "../models";
import { revokeAccountSessions } from "./session.service";
import { verifyStaffPassword, type StaffAccountType } from "./staffAuth.service";
import { detailsUpdate, emailTaken, isDuplicateKey } from "./staffDetails";

export type OwnProfileChange = { name?: string; email?: string; currentPassword?: string };

type StaffRow = { _id: Types.ObjectId; email: string };

const passwordNeeded = () =>
  new AppError("Enter your current password to change your email.", 400, "VALIDATION_FAILED", {
    fields: { currentPassword: "Enter your current password to change your email." },
  });

/** Staff rename themselves freely; a new email needs their password and signs their other devices out. */
export const updateOwnStaffProfile = async (
  accountType: StaffAccountType,
  accountId: string,
  sessionId: string,
  change: OwnProfileChange,
) => {
  const model = (accountType === "admin" ? Admin : PartnerStaff) as typeof Admin;
  const current = await model.findById(accountId, { email: 1 }).lean<StaffRow>();
  if (!current) throw new AppError("Please sign in again.", 401, "SESSION_REVOKED");

  const emailChanged = change.email !== undefined && change.email !== current.email;
  if (emailChanged) {
    if (!change.currentPassword) throw passwordNeeded();
    await verifyStaffPassword(accountType, current.email, change.currentPassword);
  }

  const details = await detailsUpdate(current, { name: change.name, ...(emailChanged && { email: change.email }) });
  try {
    await model.updateOne({ _id: current._id }, { $set: details.set });
  } catch (error) {
    if (isDuplicateKey(error)) throw emailTaken();
    throw error;
  }
  if (emailChanged) await revokeAccountSessions(accountType, current._id, "details-changed", sessionId);
  return { emailChanged };
};
