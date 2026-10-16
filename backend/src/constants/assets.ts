import type { AssetKind } from "../types/asset";

const MB = 1024 * 1024;

/** SVG is deliberately absent: browsers execute script inside it. */
export const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const ASSET_MAX_BYTES: Record<AssetKind, number> = {
  "seat-map": 5 * MB,
  "venue-cover": 5 * MB,
  "venue-gallery": 5 * MB,
  category: 2 * MB,
  site: 2 * MB,
  landing: 5 * MB,
  support: 5 * MB,
};

/** Long enough to pick a file, short enough that a leaked ticket is useless. */
export const UPLOAD_EXPIRY_SECONDS = 300;

/** Slugs and ObjectIds only, so an owner id can never escape its prefix. */
export const OWNER_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/i;
