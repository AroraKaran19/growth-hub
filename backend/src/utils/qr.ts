import crypto from "crypto";

export type CodeKind = "b" | "m";

const PREFIX = "growthhub";
const SIGNATURE_LENGTH = 22;

const signatureOf = (kind: CodeKind, ref: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(`${kind}:${ref}`).digest("base64url").slice(0, SIGNATURE_LENGTH);

export const signCode = (kind: CodeKind, ref: string, secret: string) =>
  `${PREFIX}:${kind}:${ref}.${signatureOf(kind, ref, secret)}`;

/** The booking or membership a scanned code points at, or null if it isn't ours. */
export const readCode = (code: string, secret: string): { kind: CodeKind; ref: string } | null => {
  const match = /^growthhub:(b|m):([A-Za-z0-9-]{1,40})\.([A-Za-z0-9_-]{22})$/.exec(code.trim());
  if (!match) return null;
  const [, kind, ref, signature] = match as unknown as [string, CodeKind, string, string];
  const expected = Buffer.from(signatureOf(kind, ref, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given) ? { kind, ref } : null;
};
