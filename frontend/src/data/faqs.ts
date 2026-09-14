export type Faq = {
  question: string;
  answer: string;
};

export type FaqCategoryId =
  | "bookings"
  | "payments"
  | "memberships"
  | "check-in"
  | "account"
  | "partners";

export type FaqCategory = {
  id: FaqCategoryId;
  title: string;
  summary: string;
  faqs: Faq[];
};

// Answers mirror the rules the app enforces: 24 hour free cancellation, half
// refunds inside that window, pauses of up to 5 days.
export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "bookings",
    title: "Bookings",
    summary: "Passes, seats, rescheduling and cancelling.",
    faqs: [
      {
        question: "What can I book on Growth Hub?",
        answer:
          "Hourly, half-day and full-day passes for open desks, private cabins, office spaces and meeting rooms at our partner venues across Bangalore. You pick the exact seat or room on the venue's floor plan.",
      },
      {
        question: "Can I reschedule a booking?",
        answer:
          "Yes. Open the booking in My Bookings and choose Reschedule. You can move it to any open date and start time for free; your seats, price and check-in QR stay the same.",
      },
      {
        question: "How do I cancel, and will I get a refund?",
        answer:
          "Cancel from the booking's details page. Cancelling at least 24 hours before the start refunds you in full. Inside 24 hours you get 50% back. Once a booking has started it can no longer be cancelled.",
      },
      {
        question: "Can I book for my team?",
        answer:
          "Yes. Choose how many seats you need and pick each desk on the floor plan, or book a cabin or office that seats your whole team.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments & refunds",
    summary: "Prices, GST, invoices and coupons.",
    faqs: [
      {
        question: "Do prices include GST?",
        answer:
          "Yes. Every price you see includes 18% GST, and your invoice shows the taxable value and the GST separately.",
      },
      {
        question: "Where do I find my invoice?",
        answer:
          "Open the booking in My Bookings and choose Download invoice. It opens a printable tax invoice you can save as a PDF.",
      },
      {
        question: "How long do refunds take?",
        answer:
          "Refunds go back to your original payment method within 5 to 7 working days of cancelling.",
      },
      {
        question: "How do coupons work?",
        answer:
          "Coupons live in your account under Coupons. Apply one at checkout; each shows what it covers, its minimum spend and when it expires. A coupon can be used once.",
      },
    ],
  },
  {
    id: "memberships",
    title: "Memberships",
    summary: "Reserved seats, allowances and pausing.",
    faqs: [
      {
        question: "What does a membership include?",
        answer:
          "A desk, cabin or office reserved for you at one venue for the whole plan, access every day the venue is open, meeting room hours and guest passes each cycle, and a member pass to check in.",
      },
      {
        question: "Do I need to book my seat every day?",
        answer:
          "No. Your seat is held for you for the length of the plan. Just show your member pass at reception.",
      },
      {
        question: "Can I pause my membership?",
        answer:
          "Yes, for up to 5 days at a time, from My Memberships. Your seat stays held, and the paused days are added to the end of your cycle so you keep every day you paid for. Resume early whenever you like.",
      },
      {
        question: "How are meeting room hours and guest passes used?",
        answer:
          "They are applied automatically when you book a meeting room by the hour or full-day desks for guests at your venue, before anything is charged. They reset every cycle.",
      },
      {
        question: "Which plan lengths are available?",
        answer:
          "1 week, 1 month, 3 months and 6 months. Longer plans cost less per month: 5% off for 3 months and 10% off for 6 months.",
      },
    ],
  },
  {
    id: "check-in",
    title: "Check-in",
    summary: "QR codes, arrival and directions.",
    faqs: [
      {
        question: "How do I check in?",
        answer:
          "Show the QR code from your booking, or your member pass, at reception. Staff scan it and you are in.",
      },
      {
        question: "What if I arrive late?",
        answer:
          "Your seat is held for your booked time. Arriving late does not extend the booking, so plan to arrive a few minutes early.",
      },
      {
        question: "How do I find the venue?",
        answer:
          "Every booking has a Get directions button that opens the venue in Google Maps.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & login",
    summary: "Signing in and managing your profile.",
    faqs: [
      {
        question: "How do I sign in?",
        answer:
          "With your mobile number and a one-time code sent by SMS, or with your Google account. There is no password to remember.",
      },
      {
        question: "Can I change my mobile number?",
        answer:
          "Yes. Edit your profile and update the number and country code. We use it for booking updates and sign-in codes.",
      },
    ],
  },
  {
    id: "partners",
    title: "For partners",
    summary: "Listing your space on Growth Hub.",
    faqs: [
      {
        question: "How do I list my coworking space?",
        answer:
          "Send us a message from the Contact page choosing List my space. We review the venue, map your floor plan and set up your partner dashboard.",
      },
      {
        question: "How do partners verify bookings?",
        answer:
          "The partner dashboard scans each member's QR at reception to confirm the booking and marks seats as taken in real time.",
      },
    ],
  },
];

export const findFaqCategory = (id: FaqCategoryId) =>
  FAQ_CATEGORIES.find((category) => category.id === id);
