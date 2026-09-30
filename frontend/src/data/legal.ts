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
      "How to ask for a cancellation, who decides the refund, and how rescheduling works.",
    updated: "2026-10-01",
    sections: [
      {
        id: "passes",
        heading: "Hourly, half-day and full-day passes",
        paragraphs: [
          "To cancel a pass, open it in My Bookings and choose Ask the venue to cancel, with a reason. You can ask until the booking ends.",
        ],
        bullets: [
          "The venue reviews every request and decides whether to cancel and how much to refund.",
          "Your booking and seat stay exactly as they are until the venue decides.",
          "You can withdraw a request while it is waiting, and ask again after a decline.",
        ],
      },
      {
        id: "rescheduling",
        heading: "Rescheduling",
        paragraphs: [
          "Rescheduling is free and can be done any time before a booking starts. The new date keeps your space type, seats, price and check-in QR code. Passes can be booked and moved up to 60 days ahead. Moving to a time that runs past midnight is not possible.",
        ],
      },
      {
        id: "memberships",
        heading: "Memberships",
        paragraphs: [
          "Memberships renew automatically at the end of each cycle. You can stop renewing at any time from My Memberships, and your plan stays active until the end of the cycle you have paid for.",
          "To end a plan early, ask the venue to cancel it from My Memberships. If the venue agrees, the plan ends that day, renewals stop, and the venue decides the refund.",
        ],
        bullets: [
          "Memberships cannot be paused.",
          "Add-ons bought online, such as lockers or parking, can be cancelled through a request until their first day. Add-ons paid at the front desk are handled by the venue.",
          "If a renewal payment fails, your seat is kept while Razorpay retries. If every retry fails, the plan lapses at the end of the time you have paid for.",
        ],
      },
      {
        id: "venue-changes",
        heading: "If a venue cancels",
        paragraphs: [
          "If a partner venue cannot honour your booking, for example because of an unplanned closure, the venue cancels it and refunds you. Our support team can help you find a comparable space nearby.",
        ],
      },
      {
        id: "refund-timing",
        heading: "How refunds are paid",
        paragraphs: [
          "Approved refunds are paid by the venue directly to you, in the amount it decides. The amount shows on your booking or membership once the venue approves. Coupons used on a cancelled booking are not reissued.",
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
          "Each coupon can be used as many times as it states, usually once, and cannot be exchanged for cash. On a membership a coupon applies to the first payment only.",
        ],
      },
      {
        id: "memberships",
        heading: "Memberships",
        paragraphs: [
          "A membership reserves a specific desk, cabin or office at one venue for the plan you choose and renews automatically until you stop renewing it.",
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
