export type AuthSurface = "member" | "partner" | "admin";

export const AUTH_SURFACES: readonly AuthSurface[] = ["member", "partner", "admin"];

export const isAuthSurface = (value: string): value is AuthSurface =>
  (AUTH_SURFACES as readonly string[]).includes(value);

/** Optional details a member fills in on Profile; null until they do. */
export type MemberProfileFields = {
  dateOfBirth: string | null;
  gender: string | null;
  companyName: string | null;
  jobTitle: string | null;
  industry: string | null;
  workType: string | null;
  preferredLocation: string | null;
  billingEmail: string | null;
};

export type MemberAccount = {
  id: string;
  type: "member";
  name: string | null;
  email: string | null;
  phone: { countryCode: string; number: string };
  needsOnboarding: boolean;
  createdAt: string | null;
  profile: MemberProfileFields;
};

export type PartnerAccount = {
  id: string;
  type: "partner";
  name: string;
  email: string;
  venueSlug: string;
};

export type AdminRole = "super-admin" | "admin";

export type AdminAccount = {
  id: string;
  type: "admin";
  name: string;
  email: string;
  role: AdminRole;
  permissions: string[];
};

export type AuthAccount = MemberAccount | PartnerAccount | AdminAccount;

export type AccountFor<S extends AuthSurface> = Extract<AuthAccount, { type: S }>;

export type SessionPayload<A extends AuthAccount = AuthAccount> = {
  account: A;
  accessToken: string;
  accessTokenExpiresAt: string;
};

export type AuthErrorBody = {
  message: string;
  code?: string;
  meta?: Record<string, unknown>;
};
