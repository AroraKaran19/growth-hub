export type InvoiceKind = "booking" | "membership-charge" | "addon-order";

export type MemberInvoice = {
  id: string;
  number: string;
  kind: InvoiceKind;
  reference: string;
  description: string;
  /** ISO instant of the payment. */
  date: string;
  /** Paise. */
  total: number;
  status: "ready" | "preparing";
};

export type InvoiceJobStatus = "pending" | "processing" | "done" | "failed";

export type AdminInvoice = {
  id: string;
  number: string;
  kind: InvoiceKind;
  reference: string;
  member: string;
  status: InvoiceJobStatus;
  attempts: number;
  lastError: string | null;
  emailed: boolean;
  createdAt: string;
};
