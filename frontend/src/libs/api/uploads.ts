"use client";

import { adminApi, memberApi, partnerApi } from "./client";

export const IMAGE_TYPES = ["image/webp", "image/png", "image/jpeg", "image/avif"];

export class UploadError extends Error {}

type Ticket = {
  url: string;
  fields: Record<string, string>;
  key: string;
  publicUrl: string;
  maxBytes: number;
};

const checkType = (file: File) => {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new UploadError("Upload a WebP, PNG, JPEG or AVIF image.");
  }
};

/** Sends one image straight to S3 and returns the URL it is readable at. */
export const uploadImage = async (
  file: File,
  kind: "venue-cover" | "venue-gallery" | "landing",
  ownerId: string,
): Promise<string> => {
  checkType(file);
  const { data } = await adminApi.post<{ data: Ticket }>("/admin/assets/upload-url", {
    assetKind: kind,
    ownerId,
    contentType: file.type,
  });
  await sendToS3(data.data, file);
  return data.data.publicUrl;
};

export type VenuePhotoKind = "venue-cover" | "venue-gallery";

/** A venue's own staff upload its photos; the server keys them under their venue. */
export const uploadPartnerImage = async (file: File, kind: VenuePhotoKind, ownerId: string): Promise<string> => {
  checkType(file);
  const { data } = await partnerApi.post<{ data: Ticket }>("/partner/assets/upload-url", {
    assetKind: kind,
    ownerId,
    contentType: file.type,
  });
  await sendToS3(data.data, file);
  return data.data.publicUrl;
};

/** A customer's screenshot for a support request; the server picks the key under their account. */
export const uploadSupportScreenshot = async (file: File): Promise<{ key: string; url: string }> => {
  checkType(file);
  const { data } = await memberApi.post<{ data: Ticket }>("/members/me/upload-url", {
    assetKind: "support",
    contentType: file.type,
  });
  await sendToS3(data.data, file);
  return { key: data.data.key, url: data.data.publicUrl };
};

const sendToS3 = async (ticket: Ticket, file: File) => {
  if (file.size > ticket.maxBytes) {
    throw new UploadError(`That image is over ${Math.round(ticket.maxBytes / (1024 * 1024))} MB.`);
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(ticket.fields)) form.append(key, value);
  // S3 requires the file to be the last field.
  form.append("file", file);

  const response = await fetch(ticket.url, { method: "POST", body: form }).catch(() => null);
  if (!response?.ok) throw new UploadError("The upload failed. Try again.");
};
