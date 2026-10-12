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
  /** As printed on the invoice; blank strings for parts not given. */
  billedTo?: InvoiceBilledTo;
};

export type InvoiceBilledTo = {
  /** The company when one was given, else the customer. */
  name: string;
  /** Only on invoices issued before billing details were kept. */
  company: string;
  gstin: string;
  /** Lines separated by newlines, state last. */
  address: string;
  email: string;
  phone: string;
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
