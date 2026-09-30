import type { Venue } from "@/types/venue";
import VenueHeroSection from "./sections/VenueHeroSection";
import DiscoverSpaceSection from "./sections/DiscoverSpaceSection";
import VenueCategoriesSection from "./sections/VenueCategoriesSection";
import FacilitiesSection from "./sections/FacilitiesSection";
import BasicRulesSection from "./sections/BasicRulesSection";
import OtherSpacesSection from "./sections/OtherSpacesSection";

const VenuePage = ({ venue, others }: { venue: Venue; others: Venue[] }) => {
  return (
    <>
      <VenueHeroSection venue={venue} />
      <DiscoverSpaceSection venue={venue} />
      <VenueCategoriesSection venue={venue} />
      <FacilitiesSection venue={venue} />
      <BasicRulesSection venue={venue} />
      <OtherSpacesSection others={others} />
    </>
  );
};

export default VenuePage;
