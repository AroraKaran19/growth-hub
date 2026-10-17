export type InvoiceIssuer = {
  legalName: string;
  address: string;
  email: string;
  /** Null until Growth Hub registers for GST; invoices then carry no GST. */
  gstin: string | null;
  state: string;
  stateCode: string;
  /** Renting of non-residential property; confirm with the CA before registering. */
  sac: string;
  gstRatePercent: number;
};

/** Company registration data; kept in code so a missing env var can never blank it. */
export const INVOICE_ISSUER: InvoiceIssuer = {
  legalName: "GrowthHub Connect",
  address: "4th Floor, Orion Business Centre 27, 80 Feet Road, 6th Block Koramangala, Bengaluru, Karnataka 560095",
  email: "hello@growthhub.in",
  gstin: "29IYIPS1653H1ZT",
  state: "Karnataka",
  stateCode: "29",
  sac: "997212",
  gstRatePercent: 18,
};
