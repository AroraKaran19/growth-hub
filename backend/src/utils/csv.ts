const cell = (value: unknown) => {
  if (typeof value === "number") return String(value);
  const text = value === null || value === undefined ? "" : String(value);
  // A leading formula character is neutralised so spreadsheets never run it.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const toCsv = (rows: unknown[][]) => rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
