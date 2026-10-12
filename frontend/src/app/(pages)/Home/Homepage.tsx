import { withDefaults } from "@/config/homeDefaults";
import { CATEGORIES } from "@/data/categories";
import { getHomeOverrides, getTestimonials } from "@/libs/api/site";
import { getAmenities, getCatalogueLabels, getPublishedVenues } from "@/libs/api/venues";
import { withOverrides } from "@/utils/categories";
import { localityOptionsFrom } from "@/utils/venues";
import HeroSection from "./sections/HeroSection";
import DiscoverWorkspacesSection from "./sections/DiscoverWorkspacesSection";
import FeaturesSection from "./sections/FeaturesSection";
import WorkspaceCategoriesSection from "./sections/WorkspaceCategoriesSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import AmenitiesSection from "./sections/AmenitiesSection";
import CommunitySection from "./sections/CommunitySection";
import TestimonialsSection from "./sections/TestimonialsSection";
import CtaBannerSection from "./sections/CtaBannerSection";

const Homepage = async () => {
  const [venues, overrides, testimonials, labels, allAmenities] = await Promise.all([
    getPublishedVenues(),
    getHomeOverrides(),
    getTestimonials(),
    getCatalogueLabels(),
    getAmenities(),
  ]);
  const content = withDefaults(overrides);

  // Only what some published venue lists, so a card never leads to an empty search.
  const offeredTypes = new Set(venues.flatMap((venue) => venue.workspaceTypes));
  const offeredAmenities = new Set(venues.flatMap((venue) => venue.amenities));
  const categories = CATEGORIES.filter((category) => offeredTypes.has(category.slug)).map((category) =>
    withOverrides(category, labels),
  );
  const amenities = allAmenities.filter((amenity) => offeredAmenities.has(amenity.key));

  return (
    <>
      <HeroSection content={content.hero} locations={localityOptionsFrom(venues)} />
      <DiscoverWorkspacesSection content={content.discover} venues={venues.slice(0, 3)} />
      <FeaturesSection content={content.features} />
      <WorkspaceCategoriesSection content={content.categories} categories={categories} />
      <HowItWorksSection content={content.steps} />
      <AmenitiesSection content={content.amenities} amenities={amenities} />
      <CommunitySection content={content.community} />
      <TestimonialsSection content={content.testimonials} testimonials={testimonials} />
      <CtaBannerSection content={content.cta} />
    </>
  );
};

export default Homepage;
