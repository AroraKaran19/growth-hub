import type { Testimonial } from "@/types/testimonial";

// MOCK DATA until the reviews API exists. Names are deliberately fictional
// placeholders, not real members.
export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    quote:
      "Booking a workspace takes less than a minute, and the facilities are always top-notch. Growth Hub has made my workdays so much more productive.",
    name: "Jane Doe",
    role: "Freelancer",
  },
  {
    id: "2",
    quote:
      "We moved our whole team over after one trial day. Meeting rooms are easy to grab at short notice, and the QR check-in means no queue at reception.",
    name: "John Doe",
    role: "Startup Founder",
  },
  {
    id: "3",
    quote:
      "Having a dedicated desk close to home changed how I work. The monthly plan costs less than my old commute, and the community is genuinely welcoming.",
    name: "Sam Doe",
    role: "Product Designer",
  },
];
