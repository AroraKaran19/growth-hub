import {
  MEMBER_EVENTS,
  STAFF_EVENTS,
  type MemberEvent,
  type NotificationTemplates,
  type StaffEvent,
} from "../constants/notifications";

export type EmailSettings = {
  domain: string;
  from: string;
  fromName: string;
  /** Null until MSG91 approves the reset email; required in production. */
  passwordResetTemplateId: string | null;
};

export type RazorpaySettings = {
  keyId: string;
  keySecret: string;
};

export type AwsSettings = {
  region: string;
  bucket: string;
  /** Null on EC2 or ECS, where the instance role supplies credentials. */
  accessKeyId: string | null;
  secretAccessKey: string | null;
  /** A CDN origin such as https://cdn.growthhubconnect.in, once one exists. */
  publicBaseUrl: string | null;
};

export type AppEnv = {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  mongodbUri: string;
  frontendUrl: string;
  jwtAccessSecret: string;
  authRelaySecret: string;
  msg91AuthKey: string | null;
  email: EmailSettings | null;
  razorpay: RazorpaySettings | null;
  aws: AwsSettings | null;
  trustProxy: number | boolean | string | null;
  authTestPhone: string | null;
  /** Required alongside authTestPhone: the number alone must never sign anyone in. */
  authTestOtp: string | null;
  revalidateSecret: string | null;
  razorpayWebhookSecret: string | null;
  /** Signs check-in QR codes. */
  qrSigningSecret: string | null;
  /** Bearer token the scheduler sends to the tidy-up job. */
  cronSecret: string | null;
  /** 32 bytes for encrypting venue bank account numbers. */
  payoutEncryptionKey: Buffer | null;
  /** Optional everywhere: a missing template id skips that message. */
  notifications: NotificationTemplates;
};

const MIN_SECRET_LENGTH = 32;

const parseTrustProxy = (value: string | null) => {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  if (value === "true" || value === "false") return value === "true";
  return value;
};

export const loadEnv = (source: NodeJS.ProcessEnv = process.env): AppEnv => {
  const errors: string[] = [];
  const read = (key: string) => source[key]?.trim() || null;
  const required = (key: string) => {
    const value = read(key);
    if (!value) errors.push(`${key} is required`);
    return value ?? "";
  };
  const secret = (key: string) => {
    const value = required(key);
    if (value && value.length < MIN_SECRET_LENGTH) {
      errors.push(`${key} must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    return value;
  };

  const nodeEnv = read("NODE_ENV") ?? "development";
  const isProduction = nodeEnv === "production";

  const portRaw = required("PORT");
  const port = Number(portRaw);
  if (portRaw && (!Number.isInteger(port) || port <= 0)) {
    errors.push("PORT must be a positive integer");
  }

  const msg91AuthKey = read("MSG91_AUTH_KEY");
  const emailParts = {
    domain: read("MSG91_EMAIL_DOMAIN"),
    from: read("MSG91_EMAIL_FROM"),
    fromName: read("MSG91_EMAIL_FROM_NAME"),
  };
  const email =
    msg91AuthKey && emailParts.domain && emailParts.from && emailParts.fromName
      ? {
          domain: emailParts.domain,
          from: emailParts.from,
          fromName: emailParts.fromName,
          passwordResetTemplateId: read("MSG91_EMAIL_PASSWORD_RESET_TEMPLATE_ID"),
        }
      : null;
  const authTestPhone = read("AUTH_TEST_PHONE");
  const authTestOtp = read("AUTH_TEST_OTP");
  const optionalSecret = (key: string) => {
    const value = read(key);
    if (value && value.length < MIN_SECRET_LENGTH) {
      errors.push(`${key} must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    return value;
  };
  const revalidateSecret = optionalSecret("REVALIDATE_SECRET");
  const qrSigningSecret = optionalSecret("QR_SIGNING_SECRET");
  const cronSecret = optionalSecret("CRON_SECRET");
  const payoutKeyText = read("PAYOUT_ENCRYPTION_KEY");
  const payoutEncryptionKey = payoutKeyText ? Buffer.from(payoutKeyText, "base64") : null;
  if (payoutEncryptionKey && payoutEncryptionKey.length !== 32) {
    errors.push("PAYOUT_ENCRYPTION_KEY must be 32 bytes, base64 encoded");
  }
  // Razorpay generates this one, so its length is not ours to set.
  const razorpayWebhookSecret = read("RAZORPAY_WEBHOOK_SECRET");

  const razorpayKeyId = read("RAZORPAY_KEY_ID");
  const razorpayKeySecret = read("RAZORPAY_KEY_SECRET");
  const razorpay =
    razorpayKeyId && razorpayKeySecret
      ? { keyId: razorpayKeyId, keySecret: razorpayKeySecret }
      : null;

  const awsRegion = read("AWS_REGION");
  const awsBucket = read("AWS_S3_BUCKET_NAME");
  const aws =
    awsRegion && awsBucket
      ? {
          region: awsRegion,
          bucket: awsBucket,
          accessKeyId: read("AWS_ACCESS_KEY_ID"),
          secretAccessKey: read("AWS_SECRET_ACCESS_KEY"),
          publicBaseUrl: read("AWS_S3_PUBLIC_BASE_URL"),
        }
      : null;

  const templates = <E extends string>(prefix: string, events: readonly E[]) =>
    Object.fromEntries(
      events.flatMap((event) => {
        const id = read(`${prefix}${event}`);
        return id ? [[event, id]] : [];
      }),
    ) as Partial<Record<E, string>>;
  const notifications: NotificationTemplates = {
    emailTemplates: templates<MemberEvent | StaffEvent>("MSG91_EMAIL_TEMPLATE_", [...MEMBER_EVENTS, ...STAFF_EVENTS]),
  };

  const result: AppEnv = {
    nodeEnv,
    isProduction,
    port,
    mongodbUri: required("MONGODB_URI"),
    frontendUrl: required("FRONTEND_URL"),
    jwtAccessSecret: secret("JWT_ACCESS_SECRET"),
    authRelaySecret: secret("AUTH_RELAY_SECRET"),
    msg91AuthKey,
    email,
    razorpay,
    aws,
    trustProxy: parseTrustProxy(read("TRUST_PROXY")),
    authTestPhone,
    authTestOtp,
    revalidateSecret,
    razorpayWebhookSecret,
    qrSigningSecret,
    cronSecret,
    payoutEncryptionKey,
    notifications,
  };

  // A sign-in that skips the SMS is a development convenience, and the code is
  // required so the phone number alone can never be enough.
  if (authTestPhone && !authTestOtp) {
    errors.push("AUTH_TEST_OTP is required whenever AUTH_TEST_PHONE is set");
  }

  if (isProduction) {
    if (authTestPhone) errors.push("AUTH_TEST_PHONE must not be set in production");
    if (!msg91AuthKey) errors.push("MSG91_AUTH_KEY is required in production");
    if (!email) {
      errors.push(
        "MSG91_EMAIL_DOMAIN, MSG91_EMAIL_FROM and MSG91_EMAIL_FROM_NAME are required in production",
      );
    }
    if (!email?.passwordResetTemplateId) {
      errors.push("MSG91_EMAIL_PASSWORD_RESET_TEMPLATE_ID is required in production");
    }
    if (!razorpay) {
      errors.push("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in production");
    }
    if (!aws) {
      errors.push("AWS_REGION and AWS_S3_BUCKET_NAME are required in production");
    }
    if (!revalidateSecret) errors.push("REVALIDATE_SECRET is required in production");
    if (!razorpayWebhookSecret) errors.push("RAZORPAY_WEBHOOK_SECRET is required in production");
    if (!qrSigningSecret) errors.push("QR_SIGNING_SECRET is required in production");
    if (!cronSecret) errors.push("CRON_SECRET is required in production");
    if (!payoutEncryptionKey) errors.push("PAYOUT_ENCRYPTION_KEY is required in production");
  }

  if (errors.length) {
    throw new Error(`Invalid environment:\n- ${errors.join("\n- ")}`);
  }
  return result;
};

let cached: AppEnv | null = null;

export const env = (): AppEnv => {
  cached ??= loadEnv();
  return cached;
};
