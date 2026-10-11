export type Amenity = {
  id: string;
  /** Stored on venues; fixed once created. */
  key: string;
  name: string;
  /** A name from config/feature-icons.json. */
  icon: string;
  description: string;
  visible: boolean;
};

export type AmenityInput = Pick<Amenity, "name" | "icon" | "description" | "visible">;
