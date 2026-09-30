import type { AddonUnit, ApiVenue, VenueAddonOffer } from "./catalogue";
import type { Seat } from "./seat";

/** A venue as the catalogue API returns it. */
export type Venue = ApiVenue;

export type VenueSeatMap = { id: string; image: string; seats: Seat[] };

/** One venue with its seat plan and the add-ons it offers. */
export type VenueDetail = Venue & {
  seatMap: VenueSeatMap | null;
  addons: VenueAddonOffer[];
};

/** An add-on type as a partner sees it: their price, or none yet. */
export type AddonChoice = {
  addonTypeId: string;
  key: string;
  name: string;
  description: string;
  unit: AddonUnit;
  price: number | null;
  enabled: boolean;
};

export type PartnerVenue = VenueDetail & { addonChoices: AddonChoice[] };
