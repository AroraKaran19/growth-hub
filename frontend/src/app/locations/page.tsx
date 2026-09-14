import type { Metadata } from "next";
import LocationsPage from "../(pages)/Locations/LocationsPage";

export const metadata: Metadata = {
  title: "Locations",
  description:
    "Find Growth Hub partner workspaces in Koramangala, HSR Layout, Indiranagar and more neighbourhoods across Bangalore.",
};

export default function Locations() {
  return <LocationsPage />;
}
