import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getBucketName, getPublicUrlBase, getS3Client } from "../config/aws";
import { env } from "../config/env";
import {
  ASSET_MAX_BYTES,
  CONTENT_TYPE_EXTENSIONS,
  OWNER_ID_PATTERN,
  UPLOAD_EXPIRY_SECONDS,
} from "../constants/assets";
import { AppError } from "../middlewares/error.middleware";
import type { AssetKind, UploadTicket } from "../types/asset";

/** Every key is built here, so a client can never choose where it writes. */
const KEY_BUILDERS: Record<AssetKind, (ownerId: string, extension: string) => string> = {
  "seat-map": (id, ext) => `seat-maps/${id}/${crypto.randomUUID()}.${ext}`,
  "venue-cover": (id, ext) => `venues/${id}/cover-${crypto.randomUUID()}.${ext}`,
  "venue-gallery": (id, ext) => `venues/${id}/gallery/${crypto.randomUUID()}.${ext}`,
  category: (id, ext) => `categories/${id}.${ext}`,
  site: (id, ext) => `site/${id}.${ext}`,
  landing: (id, ext) => `landing/${id}/${crypto.randomUUID()}.${ext}`,
  support: (id, ext) => `support/${id}/${crypto.randomUUID()}.${ext}`,
};

export const extensionFor = (contentType: string): string | null =>
  CONTENT_TYPE_EXTENSIONS[contentType.toLowerCase()] ?? null;

export const buildKey = (kind: AssetKind, ownerId: string, extension: string) =>
  KEY_BUILDERS[kind](ownerId, extension);

export const createUploadTicket = async (
  kind: AssetKind,
  ownerId: string,
  contentType: string,
): Promise<UploadTicket> => {
  if (!env().aws) {
    throw new AppError("Uploads are unavailable right now.", 503, "UPLOADS_UNAVAILABLE");
  }
  if (!OWNER_ID_PATTERN.test(ownerId)) {
    throw new AppError("That owner id is not valid.", 400, "OWNER_ID_INVALID");
  }

  const extension = extensionFor(contentType);
  if (!extension) {
    throw new AppError(
      "Upload a WebP, PNG, JPEG, GIF, AVIF or HEIC image.",
      400,
      "CONTENT_TYPE_UNSUPPORTED",
    );
  }

  const maxBytes = ASSET_MAX_BYTES[kind];
  const key = buildKey(kind, ownerId, extension);

  const post = await createPresignedPost(await getS3Client(), {
    Bucket: getBucketName(),
    Key: key,
    // S3 enforces both, so a client cannot exceed the size or swap the type.
    Conditions: [
      ["content-length-range", 1, maxBytes],
      ["eq", "$Content-Type", contentType],
    ],
    Fields: { "Content-Type": contentType },
    Expires: UPLOAD_EXPIRY_SECONDS,
  });

  return { ...post, key, publicUrl: readUrlFor(key), maxBytes, expiresInSeconds: UPLOAD_EXPIRY_SECONDS };
};

/**
 * Reads are plain public URLs, never signed. Venue pages are statically
 * generated, so a signed URL would be baked into prerendered HTML and expire
 * relative to the build rather than the visit.
 */
export const readUrlFor = (key: string): string => `${getPublicUrlBase()}/${key}`;

export const uploadObject = async (key: string, body: Buffer, contentType: string) => {
  if (!env().aws) throw new AppError("Uploads are unavailable right now.", 503, "UPLOADS_UNAVAILABLE");
  await (await getS3Client()).send(
    new PutObjectCommand({ Bucket: getBucketName(), Key: key, Body: body, ContentType: contentType }),
  );
  return readUrlFor(key);
};
