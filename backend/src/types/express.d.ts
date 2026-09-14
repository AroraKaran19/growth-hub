import type { AccountSummary } from "../services/account.service";
import type { AccountType } from "./auth";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        accountType: AccountType;
        accountId: string;
        sessionId: string;
        account: AccountSummary;
      };
      clientIp?: string;
      clientUserAgent?: string;
    }
  }
}

export {};
