import { env } from "../config/env";
import { AppError } from "../middlewares/error.middleware";
import { Venue, type PayoutAccount, type VenueDoc } from "../models";
import { open, seal } from "../utils/secretBox";
import type { z } from "zod";
import type { payoutAccountSchema } from "../validators/payout";
import { notifyVenueStaff } from "./notify.service";

const venueNotFound = () => new AppError("We couldn't find that venue.", 404, "VENUE_NOT_FOUND");

const keyOrFail = () => {
  const key = env().payoutEncryptionKey;
  if (!key) throw new AppError("Bank details can't be stored until PAYOUT_ENCRYPTION_KEY is set.", 503, "PAYOUTS_UNAVAILABLE");
  return key;
};

export const maskedAccount = (account: PayoutAccount | null) =>
  account && {
    accountName: account.accountName,
    accountNumberMasked: `XXXX${account.accountNumberLast4}`,
    accountNumberLast4: account.accountNumberLast4,
    ifsc: account.ifsc,
    bankName: account.bankName,
    upiId: account.upiId,
    updatedBy: account.updatedBy?.name ?? "",
    updatedAt: account.updatedAt ? new Date(account.updatedAt).toISOString() : null,
  };

const venueBySlug = async (slug: string) => {
  const venue = await Venue.findOne({ slug }, { slug: 1, name: 1, payoutAccount: 1 }).lean<VenueDoc>();
  if (!venue) throw venueNotFound();
  return venue;
};

/** Masked, unless an admin asked to reveal it; each reveal is logged. */
export const getPayoutAccount = async (slug: string, reveal: { adminId: string } | null = null) => {
  const venue = await venueBySlug(slug);
  const masked = maskedAccount(venue.payoutAccount ?? null);
  if (!masked || !reveal || !venue.payoutAccount) return masked;
  console.info(`Payout account of ${slug} revealed to admin ${reveal.adminId}`);
  return { ...masked, accountNumber: open(venue.payoutAccount.accountNumberEnc, keyOrFail()) };
};

export const setPayoutAccount = async (
  slug: string,
  input: z.infer<typeof payoutAccountSchema>,
  by: { id: string; name: string },
) => {
  const venue = await venueBySlug(slug);
  const account: PayoutAccount = {
    accountName: input.accountName,
    accountNumberEnc: seal(input.accountNumber, keyOrFail()),
    accountNumberLast4: input.accountNumber.slice(-4),
    ifsc: input.ifsc,
    bankName: input.bankName,
    upiId: input.upiId,
    updatedBy: by,
    updatedAt: new Date(),
  };
  await Venue.updateOne({ _id: venue._id }, { $set: { payoutAccount: account } });
  await notifyVenueStaff("PAYOUT_ACCOUNT_CHANGED", venue.slug, {
    venue: venue.name,
    bank: account.bankName,
    last4: account.accountNumberLast4,
  });
  return maskedAccount(account);
};
