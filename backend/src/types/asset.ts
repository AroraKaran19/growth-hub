import type { PresignedPost } from "@aws-sdk/s3-presigned-post";

export type AssetKind =
  | "seat-map"
  | "venue-cover"
  | "venue-gallery"
  | "category"
  | "site"
  | "landing"
  | "support";

export const ASSET_KINDS: readonly AssetKind[] = [
  "seat-map",
  "venue-cover",
  "venue-gallery",
  "category",
  "site",
  "landing",
  "support",
];

export const isAssetKind = (value: unknown): value is AssetKind =>
  typeof value === "string" && (ASSET_KINDS as readonly string[]).includes(value);

/** Kinds a customer uploads; their owner is always the signed-in member. */
export const MEMBER_ASSET_KINDS: readonly AssetKind[] = ["support"];

export const isMemberAssetKind = (value: unknown): value is AssetKind =>
  isAssetKind(value) && MEMBER_ASSET_KINDS.includes(value);

export type UploadTicket = PresignedPost & {
  key: string;
  publicUrl: string;
  maxBytes: number;
  expiresInSeconds: number;
};
