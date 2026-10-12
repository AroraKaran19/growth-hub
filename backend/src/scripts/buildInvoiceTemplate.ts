import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
  type IBorderOptions,
  type IParagraphOptions,
  type IRunOptions,
} from "docx";

// Rebuilds templates/invoice.docx; the {tags} are filled by utils/invoiceDocx.ts.
const TEMPLATES = path.join(__dirname, "..", "..", "templates");
const INK = "1B1B1F";
const MUTED = "6E6E73";
const FAINT = "E4E4E7";
const RED = "EC2024";
const GREEN = "15803D";
const WIDTH = 10206;
const WATERMARK_OPACITY = 0.06;

const fadedLogo = () => {
  const png = PNG.sync.read(fs.readFileSync(path.join(TEMPLATES, "logo.png")));
  for (let i = 3; i < png.data.length; i += 4) png.data[i] = Math.round(png.data[i] * WATERMARK_OPACITY);
  return PNG.sync.write(png);
};

const none: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const line = (color = FAINT, size = 6): IBorderOptions => ({ style: BorderStyle.SINGLE, size, color });
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
const cellBorders = { top: none, bottom: none, left: none, right: none };

const run = (text: string, options: IRunOptions = {}) => new TextRun({ text, color: INK, ...options });
const para = (children: TextRun[], options: IParagraphOptions = {}) =>
  new Paragraph({ spacing: { after: 40 }, ...options, children });
const text = (value: string, options: IRunOptions = {}, paragraph: IParagraphOptions = {}) => para([run(value, options)], paragraph);
const muted = (value: string, paragraph: IParagraphOptions = {}) => text(value, { color: MUTED, size: 16 }, paragraph);
const label = (value: string) => text(value, { color: MUTED, size: 16, bold: true }, { spacing: { after: 80 } });
// A paragraph holding only a section tag disappears entirely when filled.
const tag = (value: string) => new Paragraph({ children: [run(value)] });

const cell = (children: Paragraph[], width: number, options: Partial<ConstructorParameters<typeof TableCell>[0]> = {}) =>
  new TableCell({ children, width: { size: width, type: WidthType.DXA }, borders: cellBorders, ...options });

const layout = (columns: number[], rows: TableRow[]) =>
  new Table({ width: { size: WIDTH, type: WidthType.DXA }, columnWidths: columns, borders: noBorders, rows });

const header = () =>
  layout(
    [6106, 4100],
    [
      new TableRow({
        children: [
          cell(
            [
              new Paragraph({
                spacing: { after: 160 },
                children: [new ImageRun({ type: "png", data: fs.readFileSync(path.join(TEMPLATES, "logo.png")), transformation: { width: 96, height: 80 } })],
              }),
              text("{issuer.legalName}", { bold: true }),
              muted("{issuer.address}"),
              muted("{issuer.email}"),
              tag("{#taxInvoice}"),
              muted("GSTIN {issuer.gstin}"),
              tag("{/taxInvoice}"),
            ],
            6106,
          ),
          cell(
            [
              text("{title}", { bold: true, size: 40 }, { alignment: AlignmentType.RIGHT }),
              text("{invoiceNumber}", { color: MUTED, size: 18 }, { alignment: AlignmentType.RIGHT }),
              muted("Date {invoiceDate}", { alignment: AlignmentType.RIGHT }),
              text("Paid", { color: GREEN, bold: true, size: 16 }, { alignment: AlignmentType.RIGHT, spacing: { before: 120 } }),
            ],
            4100,
          ),
        ],
      }),
    ],
  );

const parties = () =>
  layout(
    [5103, 5103],
    [
      new TableRow({
        children: [
          cell(
            [
              label("Billed to"),
              text("{customer.name}", { bold: true }),
              tag("{#customer.company}"),
              text("{customer.company}"),
              tag("{/customer.company}"),
              tag("{#customer.gstin}"),
              text("GSTIN {customer.gstin}"),
              tag("{/customer.gstin}"),
              tag("{#customer.address}"),
              text("{customer.address}"),
              tag("{/customer.address}"),
              text("{customer.email}"),
              text("{customer.phone}"),
            ],
            5103,
          ),
          cell(
            [label("Workspace"), text("{service.venue}", { bold: true }), text("{service.address}"), text("{service.when}")],
            5103,
          ),
        ],
      }),
    ],
  );

const lineItems = () => {
  const headCell = (value: string, width: number, alignment: (typeof AlignmentType)[keyof typeof AlignmentType]) =>
    cell([text(value, { color: MUTED, size: 16, bold: true }, { alignment })], width, {
      borders: { ...cellBorders, bottom: line() },
    });
  return layout(
    [7206, 1200, 1800],
    [
      new TableRow({
        tableHeader: true,
        children: [
          headCell("Description", 7206, AlignmentType.LEFT),
          headCell("Qty", 1200, AlignmentType.RIGHT),
          headCell("Amount (₹)", 1800, AlignmentType.RIGHT),
        ],
      }),
      new TableRow({
        children: [
          cell([para([run("{#lines}{description}")], { spacing: { before: 120, after: 0 } }), muted("{detail}", { spacing: { after: 120 } })], 7206, {
            borders: { ...cellBorders, bottom: line("F0F0F2") },
          }),
          cell([text("{quantity}", {}, { alignment: AlignmentType.RIGHT, spacing: { before: 120 } })], 1200, {
            borders: { ...cellBorders, bottom: line("F0F0F2") },
          }),
          cell([text("{amount}{/lines}", {}, { alignment: AlignmentType.RIGHT, spacing: { before: 120 } })], 1800, {
            borders: { ...cellBorders, bottom: line("F0F0F2") },
          }),
        ],
      }),
    ],
  );
};

const totalRow = (labelText: string, value: string, options: { bold?: boolean; top?: boolean } = {}) =>
  new TableRow({
    children: [
      cell([para([])], 5406),
      cell([text(labelText, { color: options.bold ? INK : MUTED, bold: options.bold, size: options.bold ? 22 : 18 })], 2800, {
        borders: { ...cellBorders, top: options.top ? line() : none },
      }),
      cell([text(value, { bold: options.bold, size: options.bold ? 22 : 18 }, { alignment: AlignmentType.RIGHT })], 2000, {
        borders: { ...cellBorders, top: options.top ? line() : none },
      }),
    ],
  });

const totals = () =>
  layout(
    [5406, 2800, 2000],
    [
      totalRow("{#hasDiscount}{discountLabel}", "-{discount}{/hasDiscount}"),
      totalRow("{#taxInvoice}Taxable value", "{taxable}{/taxInvoice}"),
      totalRow("{#taxInvoice}CGST 9%", "{cgst}{/taxInvoice}"),
      totalRow("{#taxInvoice}SGST 9%", "{sgst}{/taxInvoice}"),
      totalRow("Total", "₹{total}", { bold: true, top: true }),
    ],
  );

const watermark = () =>
  new Header({
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: fadedLogo(),
            transformation: { width: 420, height: 349 },
            floating: {
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.CENTER },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.CENTER },
              behindDocument: true,
              allowOverlap: true,
            },
          }),
        ],
      }),
    ],
  });

const build = async () => {
  const document = new Document({
    creator: "GrowthHub Connect",
    title: "Invoice",
    // Embedded so the PDF looks the same on any server, with or without the font installed.
    fonts: [
      {
        name: "Plus Jakarta Sans",
        data: fs.readFileSync(path.join(TEMPLATES, "fonts", "PlusJakartaSans-Regular.ttf")),
        bold: fs.readFileSync(path.join(TEMPLATES, "fonts", "PlusJakartaSans-Bold.ttf")),
      },
    ],
    styles: { default: { document: { run: { font: "Plus Jakarta Sans", size: 18, color: INK } } } },
    sections: [
      {
        properties: {
          page: { size: { width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 850, right: 850, header: 0 } },
        },
        headers: { default: watermark() },
        children: [
          new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 36, color: RED, space: 1 } }, spacing: { after: 240 }, children: [] }),
          header(),
          new Paragraph({ border: { bottom: line() }, spacing: { after: 240 }, children: [] }),
          parties(),
          new Paragraph({ border: { bottom: line() }, spacing: { after: 160 }, children: [] }),
          muted("Reference {reference}"),
          tag("{#taxInvoice}"),
          muted("Place of supply {placeOfSupply}   ·   SAC {issuer.sac}"),
          tag("{/taxInvoice}"),
          new Paragraph({ spacing: { after: 160 }, children: [] }),
          lineItems(),
          new Paragraph({ spacing: { after: 120 }, children: [] }),
          totals(),
          text("{amountInWords}", { color: MUTED, size: 16, italics: true }, { alignment: AlignmentType.RIGHT, spacing: { before: 80, after: 480 } }),
          new Paragraph({ border: { top: line() }, spacing: { before: 120, after: 80 }, children: [run("{paymentNote}", { color: MUTED, size: 16 })] }),
          tag("{^taxInvoice}"),
          muted("{issuer.legalName} is not registered under GST, so no GST is charged on this invoice."),
          tag("{/taxInvoice}"),
          muted("A computer generated invoice. No signature needed."),
        ],
      },
    ],
  });
  fs.writeFileSync(path.join(TEMPLATES, "invoice.docx"), await Packer.toBuffer(document));
  console.log("Wrote templates/invoice.docx");
};

void build();
