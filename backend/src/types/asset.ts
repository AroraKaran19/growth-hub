import type { PresignedPost } from "@aws-sdk/s3-presigned-post";

export type AssetKind =
  | "seat-map"
  | "venue-cover"
  | "venue-gallery"
  | "category"
  | "site";

export const ASSET_KINDS: readonly AssetKind[] = [
  "seat-map",
  "venue-cover",
  "venue-gallery",
  "category",
  "site",
];

export const isAssetKind = (value: unknown): value is AssetKind =>
  typeof value === "string" && (ASSET_KINDS as readonly string[]).includes(value);

export type UploadTicket = PresignedPost & {
  key: string;
  maxBytes: number;
  expiresInSeconds: number;
};
