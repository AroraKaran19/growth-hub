import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import type { InvoiceData } from "../services/invoiceData.service";

export const INVOICE_TEMPLATE_PATH = path.join(__dirname, "..", "..", "templates", "invoice.docx");

// Lets tags read nested fields such as {customer.name}.
const dottedParser = (tag: string) => ({
  get: (scope: unknown) =>
    tag === "." ? scope : tag.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], scope),
});

export const fillInvoiceDocx = (data: InvoiceData, templatePath = INVOICE_TEMPLATE_PATH): Buffer => {
  const doc = new Docxtemplater(new PizZip(fs.readFileSync(templatePath)), {
    paragraphLoop: true,
    linebreaks: true,
    parser: dottedParser,
    nullGetter: () => "",
  });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
};
