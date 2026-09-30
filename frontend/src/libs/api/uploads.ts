"use client";

import { adminApi } from "./client";

export const IMAGE_TYPES = ["image/webp", "image/png", "image/jpeg", "image/avif"];

export class UploadError extends Error {}

type Ticket = {
  url: string;
  fields: Record<string, string>;
  publicUrl: string;
  maxBytes: number;
};

/** Sends one image straight to S3 and returns the URL it is readable at. */
export const uploadImage = async (
  file: File,
  kind: "venue-cover" | "venue-gallery",
  ownerId: string,
): Promise<string> => {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new UploadError("Upload a WebP, PNG, JPEG or AVIF image.");
  }

  const { data } = await adminApi.post<{ data: Ticket }>("/admin/assets/upload-url", {
    assetKind: kind,
    ownerId,
    contentType: file.type,
  });
  const ticket = data.data;
  if (file.size > ticket.maxBytes) {
    throw new UploadError(`That image is over ${Math.round(ticket.maxBytes / (1024 * 1024))} MB.`);
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(ticket.fields)) form.append(key, value);
  // S3 requires the file to be the last field.
  form.append("file", file);

  const response = await fetch(ticket.url, { method: "POST", body: form }).catch(() => null);
  if (!response?.ok) throw new UploadError("The upload failed. Try again.");
  return ticket.publicUrl;
};
