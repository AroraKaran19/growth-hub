import {
    S3Client,
    S3ClientConfig,
    HeadBucketCommand,
  } from "@aws-sdk/client-s3";
  import dotenv from "dotenv";
  
  dotenv.config();
  
  let s3Client: S3Client | null = null;
  
  /**
   * Initializes an AWS S3 client with credentials and region from environment variables.
   * Validates bucket accessibility.
   * @param regionOverride Optional region to override environment variable.
   * @throws Error if required environment variables are missing or client initialization fails.
   * @returns A configured S3Client instance.
   */
  const initializeS3 = async (regionOverride?: string): Promise<S3Client> => {
    try {
      const region = regionOverride || process.env.AWS_REGION;
      if (!region) {
        throw new Error("AWS_REGION is not defined in environment variables");
      }
  
      const config: S3ClientConfig = {
        region,
        maxAttempts: 3,
      };
  
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
      }
  
      s3Client = new S3Client(config);
      const bucketName = getBucketName();
      await validateBucket(s3Client, bucketName);
  
      console.log(`✅ AWS S3 client initialized successfully`);
      console.log(`🌍 Region: ${region}`);
      console.log(`🗂️ Bucket: ${bucketName}`);
      return s3Client;
    } catch (error) {
      console.error("Error initializing AWS S3 client:", error);
      throw error;
    }
  };
  
  /**
   * Validates that the specified S3 bucket is accessible.
   * @param client S3Client instance.
   * @param bucketName Name of the bucket to validate.
   * @throws Error if the bucket is not accessible.
   */
  const validateBucket = async (
    client: S3Client,
    bucketName: string
  ): Promise<void> => {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucketName }));
      console.log(`Bucket ${bucketName} is accessible`);
    } catch (error) {
      console.error(
        `Bucket ${bucketName} is not accessible or does not exist:`,
        error
      );
      throw error;
    }
  };
  
  /**
   * Gets the singleton S3 client instance, initializing it if necessary.
   * @returns A configured S3Client instance.
   */
  const getS3Client = async (): Promise<S3Client> => {
    if (!s3Client) {
      return await initializeS3();
    }
    return s3Client;
  };
  
  /**
   * Gets the S3 bucket name from environment variables.
   * @throws Error if AWS_S3_BUCKET_NAME is not defined.
   * @returns The bucket name.
   */
  const getBucketName = (): string => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error(
        "AWS_S3_BUCKET_NAME is not defined in environment variables"
      );
    }
    return bucketName;
  };
  
  /**
   * Gets the base URL for public file access.
   * Use AWS_S3_PUBLIC_BASE_URL to serve files from a custom domain (e.g. CloudFront CDN).
   * Example: https://cdn.airkrit.com or https://assets.airkrit.com
   * If not set, falls back to default S3 URL: https://{bucket}.s3.amazonaws.com
   */
  const getPublicUrlBase = (): string => {
    const customBase = process.env.AWS_S3_PUBLIC_BASE_URL?.trim();
    if (customBase) {
      return customBase.replace(/\/$/, ""); // Remove trailing slash
    }
    const bucketName = getBucketName();
    return `https://${bucketName}.s3.amazonaws.com`;
  };
  
  export { initializeS3, getS3Client, getBucketName, getPublicUrlBase };
  