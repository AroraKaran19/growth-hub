export type StatementStatus = "draft" | "issued" | "paid";

export const STATEMENT_STATUS_LABELS: Record<StatementStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
};

/** Money in paise, as the server sends it. */
export type StatementLine = {
  kind: "booking" | "membership-charge" | "addon-order";
  itemId: string;
  ref: string;
  invoiceNumber: string | null;
  date: string;
  description: string;
  customerName: string;
  amount: number;
  status: string;
  refundDeclared: number | null;
};

export type Statement = {
  id: string;
  venue: { slug: string; name: string };
  month: string;
  monthLabel: string;
  from: string;
  to: string;
  status: StatementStatus;
  totals: { lineCount: number; linesAmount: number; adjustmentsAmount: number; total: number };
  adjustments: { amount: number; note: string; addedBy: string; addedAt: string }[];
  generatedAt: string;
  issuedAt: string | null;
  issuedBy: string | null;
  paidOn: string | null;
  paidBy: string | null;
  utr: string | null;
  paymentNote: string;
  payoutAccount: { accountName: string; accountNumberLast4: string; ifsc: string; bankName: string } | null;
  lines?: StatementLine[];
  /** Only on the admin detail: the venue has been deleted. */
  venueRemoved?: boolean;
};

export type PayoutRow = {
  venue: { slug: string; name: string };
  /** The venue was deleted; its last statement is still here to settle. */
  removed: boolean;
  hasBankDetails: boolean;
  statement: Statement | null;
  pending: { count: number; amount: number };
};

export type PayoutAccount = {
  accountName: string;
  accountNumberMasked: string;
  accountNumberLast4: string;
  ifsc: string;
  bankName: string;
  upiId: string | null;
  updatedBy: string;
  updatedAt: string | null;
  /** Only after an admin asks to reveal it. */
  accountNumber?: string;
};

export type PayoutAccountInput = {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  upiId: string | null;
};
