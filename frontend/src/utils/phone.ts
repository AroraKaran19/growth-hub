// Mirrors backend/src/utils/phone.ts, so the box never accepts what the server refuses.
const INDIA = "+91";
const INDIA_DIGITS = 10;
const E164_MAX_DIGITS = 15;
const MIN_OTHER_DIGITS = 4;

export const maxNationalDigits = (countryCode: string) =>
  countryCode === INDIA ? INDIA_DIGITS : E164_MAX_DIGITS - countryCode.replace(/\D/g, "").length;

/** Digits for the number box: formatting, a pasted country code and a leading 0 are dropped. */
export const nationalDigits = (input: string, countryCode: string) => {
  const limit = maxNationalDigits(countryCode);
  const code = countryCode.replace(/\D/g, "");
  let digits = input.replace(/\D/g, "");
  if (input.trim().startsWith("+") && digits.startsWith(code)) digits = digits.slice(code.length);
  else if (digits.length > limit && digits.startsWith(code)) digits = digits.slice(code.length);
  if (digits.length > limit && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, limit);
};

export const isValidMobile = (digits: string, countryCode: string) =>
  countryCode === INDIA
    ? /^[6-9]\d{9}$/.test(digits)
    : digits.length >= MIN_OTHER_DIGITS && digits.length <= maxNationalDigits(countryCode);
