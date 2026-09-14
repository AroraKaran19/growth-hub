export type BlogCategory = "Guides" | "Productivity" | "Neighbourhoods";

export type BlogSection = {
  heading?: string;
  paragraphs: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  /** ISO publish date. */
  publishedOn: string;
  readMinutes: number;
  image: string;
  author: string;
  body: BlogSection[];
};

const AUTHOR = "Growth Hub Editorial";

// MOCK DATA until posts come from a CMS. Newest first.
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "day-pass-or-membership",
    title: "Day pass or membership: which one saves you more?",
    excerpt:
      "A simple way to work out when a reserved seat starts paying for itself, with real numbers from our partner venues.",
    category: "Guides",
    publishedOn: "2026-09-08",
    readMinutes: 5,
    image: "/assets/home/extras/1.webp",
    author: AUTHOR,
    body: [
      {
        paragraphs: [
          "If you work from a coworking space a few days a month, passes are almost always the better deal. Once you are in most weekdays, a membership usually wins. The question is where the line sits for you.",
        ],
      },
      {
        heading: "Count your days, not your hours",
        paragraphs: [
          "A monthly membership is priced at about 18 full-day passes at the same venue. If you expect to come in more than 18 days in a month, the membership is cheaper before you count anything else.",
          "Longer plans move the line further: a 3 month plan takes 5% off and a 6 month plan takes 10% off the monthly rate.",
        ],
      },
      {
        heading: "Then add what is included",
        paragraphs: [
          "Members get meeting room hours and guest passes every cycle. If you book two or three hours of meeting rooms a week, those hours alone can be worth more than the difference.",
          "And a reserved seat means no hunting for a spot on busy days, which is hard to price but easy to appreciate.",
        ],
      },
      {
        heading: "Still not sure?",
        paragraphs: [
          "Start with a 1 week plan. If it sticks, move to a month. You can pause for up to 5 days at a time when you travel, and the days are added back.",
        ],
      },
    ],
  },
  {
    slug: "choosing-a-coworking-space-in-bangalore",
    title: "How to choose the right coworking space in Bangalore",
    excerpt:
      "Commute, noise, meeting rooms and the small details that decide whether you will actually enjoy working somewhere.",
    category: "Guides",
    publishedOn: "2026-08-25",
    readMinutes: 6,
    image: "/assets/home/extras/2.webp",
    author: AUTHOR,
    body: [
      {
        paragraphs: [
          "A beautiful space you dread getting to is not a good workspace. Start with the practical questions and let the photos come last.",
        ],
      },
      {
        heading: "Start with the commute",
        paragraphs: [
          "Bangalore traffic turns a 6 km trip into an hour at the wrong time. Filter by neighbourhood first, and check the venue's opening hours against when you actually like to work.",
        ],
      },
      {
        heading: "Match the space to the work",
        paragraphs: [
          "Calls all day? Look for phone booths and bookable meeting rooms. Deep focus? A quiet zone or a dedicated desk away from the café helps more than any amenity list.",
        ],
      },
      {
        heading: "Try before you commit",
        paragraphs: [
          "Book a full-day pass on a normal weekday, not a quiet Friday. Notice the Wi-Fi at peak hours, how easy it is to find a seat, and how the staff treat members.",
        ],
      },
    ],
  },
  {
    slug: "meeting-room-habits",
    title: "Five meeting room habits that make every call better",
    excerpt:
      "Small routines that turn a booked room into a meeting people actually want to attend.",
    category: "Productivity",
    publishedOn: "2026-08-11",
    readMinutes: 4,
    image: "/assets/home/extras/3.webp",
    author: AUTHOR,
    body: [
      {
        heading: "1. Book for the meeting, not the calendar slot",
        paragraphs: [
          "If the agenda fits in 40 minutes, book an hour and finish early. Rooms booked back to back leave no time to reset the screen and the whiteboard.",
        ],
      },
      {
        heading: "2. Arrive five minutes early",
        paragraphs: [
          "Test the display, the camera and the Wi-Fi before anyone joins. It is the single biggest fix for awkward starts.",
        ],
      },
      {
        heading: "3. Sign your guests in ahead of time",
        paragraphs: [
          "Members can use included guest passes. Share the venue's directions link so nobody spends the first ten minutes lost in the lobby.",
        ],
      },
      {
        heading: "4. Leave the room as you found it",
        paragraphs: [
          "Wipe the board, take your cups and log out of the screen. The next team will thank you.",
        ],
      },
      {
        heading: "5. End with owners and dates",
        paragraphs: [
          "Close every meeting by naming who does what by when. It takes a minute and saves a follow-up call.",
        ],
      },
    ],
  },
  {
    slug: "koramangala-coworking-guide",
    title: "Inside Koramangala, Bangalore's busiest coworking neighbourhood",
    excerpt:
      "Why so many startups set up here, where to eat between meetings, and how to pick a venue that suits you.",
    category: "Neighbourhoods",
    publishedOn: "2026-07-28",
    readMinutes: 5,
    image: "/assets/home/extras/4.webp",
    author: AUTHOR,
    body: [
      {
        paragraphs: [
          "Koramangala packs founders, investors and agencies into a few blocks, which makes it one of the easiest places in the city to meet people by accident.",
        ],
      },
      {
        heading: "Who it suits",
        paragraphs: [
          "Early teams that take lots of meetings, and anyone who wants cafés and restaurants within walking distance. It is lively, so bring headphones if you need quiet.",
        ],
      },
      {
        heading: "Getting around",
        paragraphs: [
          "The main roads jam at peak hours. If you are coming from the east, arriving before 9:30 AM makes a real difference, and many venues open at 10.",
        ],
      },
      {
        heading: "Picking a venue",
        paragraphs: [
          "Look at meeting room capacity and phone booths first; demand is high here. A membership with included meeting room hours is often worth it for client-facing teams.",
        ],
      },
    ],
  },
  {
    slug: "first-day-checklist",
    title: "Working from a new space? A first-day checklist",
    excerpt:
      "Everything to sort out on day one so day two feels like you have been there for months.",
    category: "Productivity",
    publishedOn: "2026-07-14",
    readMinutes: 3,
    image: "/assets/home/extras/5.webp",
    author: AUTHOR,
    body: [
      {
        heading: "Before you leave home",
        paragraphs: [
          "Save your booking QR or member pass, check the venue's opening hours, and open the directions link once so it is cached on your phone.",
        ],
      },
      {
        heading: "When you arrive",
        paragraphs: [
          "Check in at reception, ask for the Wi-Fi details and find the washrooms, the pantry and the nearest phone booth before you settle in.",
        ],
      },
      {
        heading: "Before you leave",
        paragraphs: [
          "Note what you liked and what you did not. If the seat worked, you can reserve it long term with a membership next time.",
        ],
      },
    ],
  },
];

export const BLOG_CATEGORIES: BlogCategory[] = [
  "Guides",
  "Productivity",
  "Neighbourhoods",
];

export const findPost = (slug: string) =>
  BLOG_POSTS.find((post) => post.slug === slug);
