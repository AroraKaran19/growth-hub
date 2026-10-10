import type { Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import { Admin, PartnerStaff } from "../models";
import { hashPassword } from "./staffAuth.service";

export type DetailsChange = { name?: string; email?: string; temporaryPassword?: string };

export const emailTaken = () => new AppError("That email already has a Growth Hub account.", 409, "EMAIL_TAKEN");

export const hasDetails = (change: DetailsChange) =>
  change.name !== undefined || change.email !== undefined || change.temporaryPassword !== undefined;

/** The fields to set, and whether the person must sign in again. */
export const detailsUpdate = async (current: { _id: Types.ObjectId; email: string }, change: DetailsChange) => {
  const emailChanged = change.email !== undefined && change.email !== current.email;
  if (emailChanged) {
    const others = { email: change.email, _id: { $ne: current._id } };
    const [admin, partner] = await Promise.all([Admin.exists(others), PartnerStaff.exists(others)]);
    if (admin || partner) throw emailTaken();
  }

  const signOut = emailChanged || change.temporaryPassword !== undefined;
  return {
    signOut,
    set: {
      ...(change.name !== undefined && { name: change.name }),
      ...(emailChanged && { email: change.email }),
      ...(change.temporaryPassword !== undefined && {
        passwordHash: await hashPassword(change.temporaryPassword),
        mustChangePassword: true,
      }),
      // A reset link sent to the old address must stop working.
      ...(signOut && { passwordResetHash: null, passwordResetExpiresAt: null }),
    },
  };
};

export const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;
