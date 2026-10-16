import type { Metadata } from "next";
import { pageMetadata } from "@/libs/seo";
import LocationsPage from "../(pages)/Locations/LocationsPage";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("locations");

export const revalidate = 300;

export default function Locations() {
  return <LocationsPage />;
}
