export type Plan = {
  number: string;
  name: string;
  description: string;
  options: string[];
  price: number;
  originalPrice: number;
  discountPercent: number;
  ctaLabel: string;
  ctaHref: string;
  isPopular?: boolean;
};
