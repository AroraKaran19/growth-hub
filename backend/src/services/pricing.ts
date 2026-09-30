import type { AddonUnit, SeatType } from "../constants/catalogue";
import { MIN_AMOUNT_PAISE } from "../constants/payments";
import { AppError } from "../middlewares/error.middleware";

export const PASS_TYPES = ["hourly", "half-day", "full-day"] as const;

export type PassType = (typeof PASS_TYPES)[number];

export const HALF_DAY_MINUTES = 240;

type PricedVenue = { startingPrice: number; dayPassPrice: number };

/** A venue add-on as offered to customers, priced in rupees. */
export type AddonOffer = { key: string; name: string; unit: AddonUnit; price: number };

export type AddonLine = { key: string; name: string; unit: AddonUnit; unitPrice: number; quantity: number; amount: number };

export type PassPrice = {
  rate: number;
  units: number;
  hours: number;
  base: number;
  addonsTotal: number;
  subtotal: number;
  couponCode: string | null;
  discount: number;
  total: number;
  /** What the gateway is asked for: 0, or at least its minimum. */
  payable: number;
  minimumApplied: boolean;
};

export const toPaise = (rupees: number) => Math.round(rupees * 100);

/** Desks are charged per seat; a room is one unit whatever the head count. */
export const unitsFor = (spaceType: SeatType, people: number) => (spaceType === "desk" ? people : 1);

export const passRate = (venue: PricedVenue, passType: PassType) => {
  if (passType === "hourly") return toPaise(venue.startingPrice);
  if (passType === "half-day") return toPaise(Math.round(venue.dayPassPrice * 0.6));
  return toPaise(venue.dayPassPrice);
};

const priceUnavailable = (message: string) => new AppError(message, 422, "PRICE_UNAVAILABLE");

export const addonLines = (
  offers: AddonOffer[],
  keys: string[],
  { people, days }: { people: number; days: number },
): AddonLine[] => {
  if (new Set(keys).size !== keys.length) throw priceUnavailable("Each add-on can be picked once.");
  return keys.map((key) => {
    const offer = offers.find((item) => item.key === key);
    if (!offer) throw priceUnavailable("One of those add-ons isn't offered here any more.");
    const unitPrice = toPaise(offer.price);
    const quantity = offer.unit === "per-booking" ? 1 : offer.unit === "per-person" ? people * days : days;
    return { key, name: offer.name, unit: offer.unit, unitPrice, quantity, amount: unitPrice * quantity };
  });
};

export type PassQuoteInput = {
  venue: PricedVenue;
  offers: AddonOffer[];
  passType: PassType;
  spaceType: SeatType;
  people: number;
  hours: number;
  addonKeys: string[];
};

export const quotePassLines = (input: PassQuoteInput) => {
  const rate = passRate(input.venue, input.passType);
  const units = unitsFor(input.spaceType, input.people);
  const hours = input.passType === "hourly" ? input.hours : 1;
  const base = rate * units * hours;
  const addons = addonLines(input.offers, input.addonKeys, { people: input.people, days: 1 });
  const addonsTotal = addons.reduce((sum, line) => sum + line.amount, 0);
  const subtotal = base + addonsTotal;
  const discount = 0;
  const total = Math.max(subtotal - discount, 0);
  const payable = total === 0 ? 0 : Math.max(total, MIN_AMOUNT_PAISE);

  const price: PassPrice = {
    rate,
    units,
    hours,
    base,
    addonsTotal,
    subtotal,
    couponCode: null,
    discount,
    total,
    payable,
    minimumApplied: payable !== total,
  };
  return { price, addons };
};

export const quotePass = (input: PassQuoteInput): PassPrice => quotePassLines(input).price;

/** The same price with a coupon's discount, or none, applied to its subtotal. */
export const discountedPrice = (price: PassPrice, couponCode: string | null, discount: number): PassPrice => {
  const total = Math.max(price.subtotal - discount, 0);
  const payable = total === 0 ? 0 : Math.max(total, MIN_AMOUNT_PAISE);
  return { ...price, couponCode, discount, total, payable, minimumApplied: payable !== total };
};
