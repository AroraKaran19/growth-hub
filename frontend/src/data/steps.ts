export type Step = {
  number: string;
  title: string;
  description: string;
};

export const STEPS: Step[] = [
  {
    number: "01",
    title: "Explore",
    description:
      "Find the ideal workspace based on your location, schedule, and work style.",
  },
  {
    number: "02",
    title: "Book",
    description:
      "Select your seat or meeting room and confirm your reservation in seconds.",
  },
  {
    number: "03",
    title: "Pay Securely",
    description:
      "Complete your payment online and receive your booking confirmation instantly.",
  },
  {
    number: "04",
    title: "QR Check-in",
    description: "Scan your QR code at Reception and check in instantly.",
  },
];
