import type { WorkspaceType } from "./search";

export type Venue = {
  id: string;
  slug: string;
  name: string;
  locality: string;
  localityId: string;
  city: string;
  image: string;
  gallery: string[];
  rating: number;
  seatsAvailable: number;
  startingPrice: number;
  priceUnit: "hr" | "day" | "month";
  description: string;
  longDescription: string;
  dayPassPrice: number;
  distanceKm: number;
  openDaysLabel: string;
  openHours: string;
  hoursNote: string;
  /** The venue's Google Maps link, opened for directions after booking. */
  googleMapsUrl: string;
  rules: string[];
  offer?: {
    label: string;
    details: string;
  };
  workspaceTypes: WorkspaceType[];
  amenities: string[];
};
