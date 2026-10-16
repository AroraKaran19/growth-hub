export type WorkspaceType =
  | "hot-desk"
  | "dedicated-desk"
  | "private-cabin"
  | "office"
  | "meeting-room";

export type BookingDuration =
  | "hourly"
  | "half-day"
  | "full-day"
  | "weekly"
  | "monthly";

export type SelectOption = {
  label: string;
  value: string;
};

// Shape the hero search submits; mirrors the /workspaces query string.
// Key names match the /workspaces filter params so a hero search lands with
// its filters already applied. date/people/duration ride along for booking.
export type WorkspaceSearchParams = {
  locality?: string;
  date?: string;
  people?: string;
  duration?: BookingDuration | "";
  type?: WorkspaceType | "";
};
