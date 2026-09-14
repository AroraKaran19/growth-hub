export type LegalSection = {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocumentId = "privacy" | "terms" | "cancellation-policy";

export type LegalDocument = {
  id: LegalDocumentId;
  title: string;
  summary: string;
  /** ISO date of the last change. */
  updated: string;
  sections: LegalSection[];
};

// PLACEHOLDER COPY until legal review. The cancellation rules match what the
// app enforces, so change both together.
export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  "cancellation-policy": {
    id: "cancellation-policy",
    title: "Cancellation & Refund Policy",
    summary:
      "When you can cancel or reschedule, what comes back to you, and how long it takes.",
    updated: "2026-09-01",
    sections: [
      {
        id: "passes",
        heading: "Hourly, half-day and full-day passes",
        paragraphs: [
          "You can cancel a pass from its page in My Bookings until the booking starts.",
        ],
        bullets: [
          "At least 24 hours before the start: a full refund.",
          "Less than 24 hours before the start: a 50% refund.",
          "After the booking has started: no refund, and the booking can no longer be cancelled.",
        ],
      },
      {
        id: "rescheduling",
        heading: "Rescheduling",
        paragraphs: [
          "Rescheduling is free and can be done any time before a booking starts. The new date keeps your space type, seats, price and check-in QR code. Moving to a time that runs past midnight is not possible.",
        ],
      },
      {
        id: "memberships",
        heading: "Memberships",
        paragraphs: [
          "Memberships renew automatically at the end of each cycle. You can turn off auto-renew at any time from My Memberships, and your plan stays active until the end of the cycle you have paid for.",
          "Cycles that have already started are not refunded. If a membership has not started yet, contact us and we will cancel it with a full refund.",
        ],
        bullets: [
          "Pause a membership for up to 5 days at a time. Your seat stays held and the paused days are added to the end of your cycle.",
          "Resume early whenever you like. Unused pause days are taken back off the cycle.",
        ],
      },
      {
        id: "venue-changes",
        heading: "If a venue cancels",
        paragraphs: [
          "If a partner venue cannot honour your booking, for example because of an unplanned closure, we refund you in full or move you to a comparable space nearby, whichever you prefer.",
        ],
      },
      {
        id: "refund-timing",
        heading: "How refunds are paid",
        paragraphs: [
          "Refunds go back to the payment method you used and usually arrive within 5 to 7 working days. Coupons used on a cancelled booking are not reissued.",
        ],
      },
      {
        id: "help",
        heading: "Getting help",
        paragraphs: [
          "If something went wrong with a booking, contact us within 7 days with your booking ID and we will look into it.",
        ],
      },
    ],
  },
  terms: {
    id: "terms",
    title: "Terms of Use",
    summary:
      "The agreement between you and Growth Hub when you browse, book or become a member.",
    updated: "2026-09-01",
    sections: [
      {
        id: "about",
        heading: "About these terms",
        paragraphs: [
          "Growth Hub runs a marketplace that lists workspaces operated by independent partner venues. By creating an account or making a booking you agree to these terms. The partner venue remains responsible for the space itself.",
        ],
      },
      {
        id: "accounts",
        heading: "Your account",
        paragraphs: [
          "You sign in with a mobile number verified by a one-time code, or with a Google account. Keep access to your phone and email secure; you are responsible for bookings made from your account.",
        ],
      },
      {
        id: "bookings",
        heading: "Bookings and payments",
        paragraphs: [
          "A booking is confirmed once payment succeeds and you receive a booking ID and QR code. Prices are shown in Indian rupees and include GST.",
        ],
        bullets: [
          "Use your space only during the booked time.",
          "Desks are booked per person; rooms are booked for the whole party.",
          "Coupons can be used once and cannot be exchanged for cash.",
        ],
      },
      {
        id: "memberships",
        heading: "Memberships",
        paragraphs: [
          "A membership reserves a specific desk, cabin or office at one venue for the plan you choose and renews automatically until you turn renewal off. Included meeting room hours and guest passes reset each cycle and do not carry over.",
        ],
      },
      {
        id: "conduct",
        heading: "At the venue",
        paragraphs: [
          "Follow the house rules shown on each venue's page, sign guests in at reception, and treat the space and other members with respect. Venues may refuse entry for serious or repeated breaches.",
        ],
      },
      {
        id: "liability",
        heading: "Liability",
        paragraphs: [
          "We work hard to keep listings accurate, but the venue controls its facilities. To the extent the law allows, our liability for any booking is limited to the amount you paid for it.",
        ],
      },
      {
        id: "law",
        heading: "Governing law",
        paragraphs: [
          "These terms are governed by the laws of India, and the courts of Bengaluru, Karnataka have jurisdiction over any dispute.",
        ],
      },
    ],
  },
  privacy: {
    id: "privacy",
    title: "Privacy Policy",
    summary: "What we collect, why we collect it, and the choices you have.",
    updated: "2026-09-01",
    sections: [
      {
        id: "collect",
        heading: "What we collect",
        paragraphs: ["We collect only what we need to run your bookings:"],
        bullets: [
          "Account details: your name, mobile number, email and, if you add them, company and job details.",
          "Bookings: the venues, dates, seats and memberships you choose.",
          "Payments: the amount and status. Card details are handled by our payment provider and never stored by us.",
          "Usage: basic device and log information to keep the service secure and working.",
        ],
      },
      {
        id: "use",
        heading: "How we use it",
        paragraphs: [
          "To confirm bookings, send check-in codes and updates, issue invoices and refunds, prevent fraud, and improve Growth Hub. We do not sell your personal data.",
        ],
      },
      {
        id: "sharing",
        heading: "Who we share it with",
        paragraphs: [
          "The partner venue you book receives your name, booking details and check-in status so they can welcome you. Payment and messaging providers process data on our behalf under contract.",
        ],
      },
      {
        id: "retention",
        heading: "How long we keep it",
        paragraphs: [
          "Booking and invoice records are kept for as long as tax law requires. Other account data is deleted within 90 days of you closing your account.",
        ],
      },
      {
        id: "rights",
        heading: "Your choices",
        paragraphs: [
          "You can view and edit your profile at any time, ask for a copy of your data, or ask us to delete your account by writing to hello@growthhub.in.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies and local storage",
        paragraphs: [
          "We use essential browser storage to keep you signed in and remember booking progress. We do not use advertising cookies.",
        ],
      },
    ],
  },
};
