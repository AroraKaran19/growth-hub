import { HeadBucketCommand, S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import { env } from "./env";

let s3Client: S3Client | null = null;

const settings = () => {
  const { aws } = env();
  if (!aws) {
    throw new Error("AWS_REGION and AWS_S3_BUCKET_NAME are not configured");
  }
  return aws;
};

export const getBucketName = (): string => settings().bucket;

/**
 * Object storage is read through presigned URLs or a CDN, never a public
 * bucket. The region belongs in the hostname: the region-less form is only
 * reliable for us-east-1 and misbehaves elsewhere.
 */
export const getPublicUrlBase = (): string => {
  const { bucket, region, publicBaseUrl } = settings();
  if (publicBaseUrl) return publicBaseUrl.replace(/\/$/, "");
  return `https://${bucket}.s3.${region}.amazonaws.com`;
};

export const initializeS3 = async (): Promise<S3Client> => {
  const { region, accessKeyId, secretAccessKey, bucket } = settings();

  const config: S3ClientConfig = { region, maxAttempts: 3 };
  // Without explicit keys the SDK falls back to the instance or task role.
  if (accessKeyId && secretAccessKey) {
    config.credentials = { accessKeyId, secretAccessKey };
  }

  const client = new S3Client(config);
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  s3Client = client;

  console.log(`✅ S3 ready: ${bucket} (${region})`);
  return client;
};

export const getS3Client = async (): Promise<S3Client> => {
  if (s3Client) return s3Client;

  const { region, accessKeyId, secretAccessKey } = settings();
  const config: S3ClientConfig = { region, maxAttempts: 3 };
  if (accessKeyId && secretAccessKey) {
    config.credentials = { accessKeyId, secretAccessKey };
  }
  s3Client = new S3Client(config);
  return s3Client;
};
