export type AccountType = "member" | "partner" | "admin";

export const ACCOUNT_TYPES: readonly AccountType[] = ["member", "partner", "admin"];

export const isAccountType = (value: unknown): value is AccountType =>
  typeof value === "string" && (ACCOUNT_TYPES as readonly string[]).includes(value);

export type AccountStatus = "active" | "disabled";
