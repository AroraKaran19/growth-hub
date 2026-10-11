export type GrossLine = { description: string; detail?: string; quantity: number; gross: number };

type FiguresInput = { lines: GrossLine[]; discount: number; charged: number; gstRatePercent: number };

/** Paise throughout. Prices include GST, so tax is backed out of what was charged, never added. */
export const invoiceFigures = ({ lines, discount, charged, gstRatePercent }: FiguresInput) => {
  const exTax = (gross: number) => Math.round((gross * 100) / (100 + gstRatePercent));
  const net = lines.reduce((sum, line) => sum + line.gross, 0) - discount;
  const all: GrossLine[] =
    charged > net ? [...lines, { description: "Minimum payment adjustment", quantity: 1, gross: charged - net }] : lines;

  const taxable = exTax(charged);
  const gst = charged - taxable;
  const cgst = Math.floor(gst / 2);
  const priced = all.map((line) => ({ ...line, taxable: exTax(line.gross) }));
  const linesTaxable = priced.reduce((sum, line) => sum + line.taxable, 0);

  // Rounding lands on the discount row when there is one, else on the last line.
  let discountTaxable = 0;
  if (discount > 0) discountTaxable = linesTaxable - taxable;
  else if (priced.length) priced[priced.length - 1].taxable += taxable - linesTaxable;

  return { lines: priced, discountTaxable, taxable, cgst, sgst: gst - cgst, total: charged };
};
