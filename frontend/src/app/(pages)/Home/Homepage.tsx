import { getPublishedVenues } from "@/libs/api/venues";
import { localityOptionsFrom } from "@/utils/venues";
import HeroSection from "./sections/HeroSection";
import DiscoverWorkspacesSection from "./sections/DiscoverWorkspacesSection";
import FeaturesSection from "./sections/FeaturesSection";
import WorkspaceCategoriesSection from "./sections/WorkspaceCategoriesSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import AmenitiesSection from "./sections/AmenitiesSection";
import PlansSection from "./sections/PlansSection";
import CommunitySection from "./sections/CommunitySection";
import TestimonialsSection from "./sections/TestimonialsSection";
import CtaBannerSection from "./sections/CtaBannerSection";

const Homepage = async () => {
  const venues = await getPublishedVenues();

  return (
    <>
      <HeroSection locations={localityOptionsFrom(venues)} />
      <DiscoverWorkspacesSection venues={venues.slice(0, 3)} />
      <FeaturesSection />
      <WorkspaceCategoriesSection />
      <HowItWorksSection />
      <AmenitiesSection />
      <PlansSection />
      <CommunitySection />
      <TestimonialsSection />
      <CtaBannerSection />
    </>
  );
};

export default Homepage;
