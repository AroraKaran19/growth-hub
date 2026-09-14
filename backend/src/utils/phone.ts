export type ParsedPhone = {
  countryCode: string;
  phoneNumber: string;
  e164: string;
  /** E.164 without the plus, the form MSG91 uses. */
  digits: string;
};

const COUNTRY_CODE = /^\+\d{1,4}$/;
const INDIA_MOBILE = /^[6-9]\d{9}$/;
const OTHER_NUMBER = /^\d{4,14}$/;
const E164_MAX_DIGITS = 15;

export const digitsOnly = (value: unknown) => String(value ?? "").replace(/\D/g, "");

export const parsePhone = (countryCodeInput: unknown, phoneNumberInput: unknown): ParsedPhone | null => {
  const countryCode = String(countryCodeInput ?? "").trim();
  const phoneNumber = digitsOnly(phoneNumberInput);
  if (!COUNTRY_CODE.test(countryCode)) return null;

  const valid =
    countryCode === "+91" ? INDIA_MOBILE.test(phoneNumber) : OTHER_NUMBER.test(phoneNumber);
  const digits = `${countryCode.slice(1)}${phoneNumber}`;
  if (!valid || digits.length > E164_MAX_DIGITS) return null;

  return { countryCode, phoneNumber, e164: `+${digits}`, digits };
};
