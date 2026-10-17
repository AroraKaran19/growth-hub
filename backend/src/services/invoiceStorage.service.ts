import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { getBucketName, getS3Client } from "../config/aws";

/** "GH/2026-27/000001" as a file name members can keep. */
export const invoiceFileName = (invoiceNumber: string) => `Invoice ${invoiceNumber.replace(/\//g, "-")}.pdf`;

/** Random keys under invoices/, never a public URL: an invoice carries a member's details. */
export const storeInvoicePdf = async (invoiceNumber: string, pdf: Buffer) => {
  const year = invoiceNumber.split("/")[1] ?? "unknown";
  const key = `invoices/${year}/${crypto.randomUUID()}.pdf`;
  await (await getS3Client()).send(
    new PutObjectCommand({ Bucket: getBucketName(), Key: key, Body: pdf, ContentType: "application/pdf" }),
  );
  return key;
};

export const readInvoicePdf = async (key: string) => {
  const object = await (await getS3Client()).send(new GetObjectCommand({ Bucket: getBucketName(), Key: key }));
  return Buffer.from(await object.Body!.transformToByteArray());
};

export const signedInvoiceUrl =async (key: string, invoiceNumber: string, seconds: number, disposition: "attachment" | "inline" = "attachment") =>
  getSignedUrl(
    await getS3Client(),
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ResponseContentDisposition: `${disposition}; filename="${invoiceFileName(invoiceNumber)}"`,
      ResponseContentType: "application/pdf",
    }),
    { expiresIn: seconds },
  );
