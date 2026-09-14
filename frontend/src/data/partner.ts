import type { PartnerBooking, PartnerMember } from "@/types/partner";

// The venue the seed bookings and members belong to, used as a fallback when a
// staff account has no venue yet.
export const PARTNER_ACCOUNT = {
  venueSlug: "awfis-coworking-koramangala",
};

type SeedBooking = Omit<PartnerBooking, "date" | "source"> & {
  /** Days from today, so the desk always has arrivals to work with. */
  dayOffset: number;
};

// MOCK bookings by other members at the partner venue. Names are obviously
// fictional placeholders.
export const PARTNER_SEED_BOOKINGS: SeedBooking[] = [
  {
    bookingId: "091822000101",
    memberName: "John Doe",
    phone: "+91 90000 00011",
    type: "Open Desk",
    seats: ["D1"],
    time: "10:00 AM - 6:00 PM",
    total: 300,
    status: "checked-in",
    dayOffset: 0,
  },
  {
    bookingId: "091822000102",
    memberName: "Richard Roe",
    phone: "+91 90000 00012",
    type: "Open Desk",
    seats: ["D2", "D4"],
    time: "12:00 PM - 04:00 PM",
    total: 360,
    status: "upcoming",
    dayOffset: 0,
  },
  {
    bookingId: "091822000103",
    memberName: "Sam Sample",
    phone: "+91 90000 00013",
    type: "Meeting Room",
    seats: ["Meeting Room"],
    time: "02:00 PM - 04:00 PM",
    total: 600,
    status: "upcoming",
    dayOffset: 0,
  },
  {
    bookingId: "091822000104",
    memberName: "Alex Example",
    phone: "+91 90000 00014",
    type: "Private Cabin",
    seats: ["Private Cabin"],
    time: "10:00 AM - 6:00 PM",
    total: 300,
    status: "upcoming",
    dayOffset: 0,
  },
  {
    bookingId: "091822000105",
    memberName: "Pat Placeholder",
    phone: "+91 90000 00015",
    type: "Open Desk",
    seats: ["D6"],
    time: "12:30 PM - 04:30 PM",
    total: 180,
    status: "cancelled",
    dayOffset: 0,
  },
  {
    bookingId: "091821999901",
    memberName: "Taylor Test",
    phone: "+91 90000 00016",
    type: "Open Desk",
    seats: ["D5"],
    time: "10:00 AM - 6:00 PM",
    total: 300,
    status: "completed",
    dayOffset: -1,
  },
  {
    bookingId: "091821999902",
    memberName: "Morgan Mock",
    phone: "+91 90000 00017",
    type: "Meeting Room",
    seats: ["Meeting Room"],
    time: "11:00 AM - 12:00 PM",
    total: 300,
    status: "no-show",
    dayOffset: -1,
  },
  {
    bookingId: "091822000201",
    memberName: "Morgan Mock",
    phone: "+91 90000 00017",
    type: "Open Desk",
    seats: ["D10", "D11", "D12"],
    time: "10:00 AM - 6:00 PM",
    total: 900,
    status: "upcoming",
    dayOffset: 1,
  },
  {
    bookingId: "091822000202",
    memberName: "John Doe",
    phone: "+91 90000 00011",
    type: "Meeting Room",
    seats: ["Meeting Room"],
    time: "03:00 PM - 05:00 PM",
    total: 600,
    status: "upcoming",
    dayOffset: 1,
  },
  {
    bookingId: "091822000301",
    memberName: "Richard Roe",
    phone: "+91 90000 00012",
    type: "Office Space",
    seats: ["Office Space 1"],
    time: "10:00 AM - 6:00 PM",
    total: 300,
    status: "upcoming",
    dayOffset: 3,
  },
];

// MOCK memberships held by other members at the partner venue.
export const PARTNER_SEED_MEMBERS: PartnerMember[] = [
  {
    membershipId: "m-11",
    memberName: "John Doe",
    phone: "+91 90000 00011",
    plan: "3 Months",
    workspace: "Dedicated Desk",
    seats: ["C1"],
    status: "active",
    renewsOn: "2026-11-20",
    source: "seed",
  },
  {
    membershipId: "m-12",
    memberName: "Richard Roe",
    phone: "+91 90000 00012",
    plan: "1 Month",
    workspace: "Office Space",
    seats: ["Office Space 2"],
    status: "active",
    renewsOn: "2026-10-12",
    source: "seed",
  },
  {
    membershipId: "m-13",
    memberName: "Sam Sample",
    phone: "+91 90000 00013",
    plan: "6 Months",
    workspace: "Dedicated Desk",
    seats: ["B4"],
    status: "paused",
    renewsOn: "2027-01-09",
    resumesOn: "2026-09-17",
    source: "seed",
  },
];
