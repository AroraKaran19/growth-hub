import type { MemberProfile } from "@/types/member";

// MOCK DATA until the members API exists. Name and email are deliberately
// placeholders, not a real member.
export const MEMBER: MemberProfile = {
  name: "Jane Doe",
  memberId: "01495975",
  // ISO so a date input can read it; displayed formatted when not editing.
  dateOfBirth: "1994-03-14",
  email: "jane.doe@example.com",
  gender: "prefer-not-to-say",
  mobileCountryCode: "+91",
  mobile: "9000000000",
  companyName: "Doe Consulting",
  jobTitle: "Product Designer",
  industry: "design",
  workType: "hybrid",
  memberSince: "March 2025",
  preferredLocation: "koramangala",
  billingEmail: "billing@example.com",
  upcomingBookings: "2",
  completedBookings: "9",
  favouriteHub: "Awfis Coworking, Koramangala",
  rewardPoints: "1,240",
  stats: [
    { label: "Total Bookings", value: "11" },
    { label: "Total Spent", value: "₹86.3k" },
    { label: "Attendance Rate", value: "98%" },
    { label: "Time Spent", value: "18h" },
  ],
};
