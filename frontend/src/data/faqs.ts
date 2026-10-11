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

// Answers mirror the rules the app enforces: cancellations are requests the
// venue decides, memberships renew until stopped.
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
          "Yes. Open the booking in My Bookings and choose Reschedule. You can move it to any open date and start time up to 60 days ahead for free; your seats, price and check-in QR stay the same.",
      },
      {
        question: "How do I cancel, and will I get a refund?",
        answer:
          "Open the booking in My Bookings and choose Ask the venue to cancel. The venue decides, and if it agrees it refunds you directly, in the amount it sets. Your booking stays as it is until then, and you can withdraw the request while it waits.",
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
    summary: "Prices, invoices and coupons.",
    faqs: [
      {
        question: "Is anything added at checkout?",
        answer:
          "No. The price you see is the price you pay, with no booking or convenience fees.",
      },
      {
        question: "Where do I find my invoice?",
        answer:
          "Open Invoices in your account to download a PDF of any invoice. We also email each one to you after you pay.",
      },
      {
        question: "How are refunds paid?",
        answer:
          "The venue pays approved refunds directly to you. The amount appears on your booking once the venue approves; how quickly it arrives depends on the venue and your payment method.",
      },
      {
        question: "How do coupons work?",
        answer:
          "Offers open to everyone appear under Coupons in your account, and you can add a code you were given. Apply one on the payment step; each shows what it covers, its minimum spend and when it ends. Most coupons can be used once, and a use is not returned if the booking is cancelled. On a membership a coupon comes off the first payment only.",
      },
    ],
  },
  {
    id: "memberships",
    title: "Memberships",
    summary: "Reserved seats, renewals and stopping a plan.",
    faqs: [
      {
        question: "What does a membership include?",
        answer:
          "A desk, cabin or office reserved for you at one venue, access every day the venue is open, and a member pass to check in. Extras such as lockers or parking are added at the venue's prices.",
      },
      {
        question: "How do I add a locker or parking to my membership?",
        answer:
          "Choose Buy add-ons on your plan in My Memberships, pick the days and the extras, and pay once. You can also buy them at the front desk. Online add-ons can be cancelled through a request until their first day; the venue decides and refunds you directly.",
      },
      {
        question: "Do I need to book my seat every day?",
        answer:
          "No. Your seat is held for you for as long as the plan runs. Just show your member pass at reception.",
      },
      {
        question: "How does renewal work?",
        answer:
          "You pay the first cycle when you join. After that the plan renews on its own through Razorpay, by card, UPI or bank mandate, until you stop it.",
      },
      {
        question: "How do I stop my membership?",
        answer:
          "Choose Stop renewing in My Memberships. Nothing more is charged, and your seat stays yours until the end of the time you have paid for. Plans cannot be paused.",
      },
      {
        question: "What if a renewal payment fails?",
        answer:
          "Razorpay retries it over the next few days and your seat stays yours meanwhile. If every retry fails, the plan lapses and the seat is released once your paid time runs out.",
      },
      {
        question: "Which plan lengths are available?",
        answer:
          "1 week, 1 month, 3 months and 6 months, where the venue offers them. Each venue sets its own plan prices.",
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
