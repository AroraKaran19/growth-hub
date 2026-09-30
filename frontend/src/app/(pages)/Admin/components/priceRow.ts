/** A rate box: typed text wins, otherwise it follows the server's value. */
export const rateField = (typed: string | null, saved: number) => {
  const text = typed ?? String(saved);
  const value = Number(text);
  return { text, value, isEdited: value !== saved };
};

export const rateError = (hourly: number, day: number): string | null => {
  if (!(hourly > 0) || !(day > 0)) return "Both rates must be above ₹0.";
  if (hourly > day) return "Day pass can't cost less than an hour.";
  return null;
};
