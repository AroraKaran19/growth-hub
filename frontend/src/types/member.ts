export type MemberStat = {
  label: string;
  value: string;
};

export type MemberProfile = {
  name: string;
  memberId: string;
  dateOfBirth: string;
  email: string;
  gender: string;
  /** Dialling code such as "+91", chosen separately from the number. */
  mobileCountryCode: string;
  /** National number, digits only. */
  mobile: string;
  companyName: string;
  jobTitle: string;
  industry: string;
  workType: string;
  memberSince: string;
  preferredLocation: string;
  billingEmail: string;
  upcomingBookings: string;
  completedBookings: string;
  favouriteHub: string;
  rewardPoints: string;
  stats: MemberStat[];
};
