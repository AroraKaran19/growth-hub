/** A rate box: typed text wins, otherwise it follows the server's value. Empty means not sold. */
export const rateField = (typed: string | null, saved: number | null) => {
  const text = typed ?? (saved === null ? "" : String(saved));
  const value = text.trim() === "" ? null : Number(text);
  return { text, value, isEdited: value !== saved };
};

export const rateError = (hourly: number | null, halfDay: number | null, day: number | null): string | null => {
  if ([hourly, halfDay, day].some((rate) => rate !== null && !(rate > 0))) {
    return "Enter a price above ₹0, or leave it empty if it isn't sold.";
  }
  if (hourly !== null && day !== null && hourly > day) return "Day pass can't cost less than an hour.";
  return null;
};
