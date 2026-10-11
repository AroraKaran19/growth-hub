import type { FEATURE_ICONS } from "./featureIcons";

type DefaultAmenity = { key: string; name: string; icon: (typeof FEATURE_ICONS)[number]; description: string };

/** Copied into the amenities collection once; admins manage the list from then on. */
export const DEFAULT_AMENITIES: DefaultAmenity[] = [
  { key: "wifi", name: "High-Speed Wi-Fi", icon: "Wifi", description: "Stay connected with fast, reliable internet for uninterrupted work." },
  { key: "cafe", name: "Café & Refreshments", icon: "Coffee", description: "Enjoy freshly brewed coffee and tea throughout the day." },
  { key: "meeting-rooms", name: "Meeting Rooms", icon: "Users", description: "Fully equipped rooms for client calls, interviews and workshops." },
  { key: "printing", name: "Printing & Scanning", icon: "Printer", description: "Convenient printing and scanning whenever you need it." },
  { key: "parking", name: "Dedicated Parking", icon: "SquareParking", description: "Parking for cars and two-wheelers at selected locations." },
  { key: "air-conditioning", name: "Air-Conditioned Spaces", icon: "Snowflake", description: "Climate-controlled floors that stay comfortable through the day." },
  { key: "power-backup", name: "Power Backup", icon: "Plug", description: "Full power backup so an outage never interrupts your day." },
  { key: "secure-access", name: "Secure Access", icon: "ShieldCheck", description: "Keycard entry and on-site security, logged around the clock." },
  { key: "phone-booths", name: "Phone Booths", icon: "Phone", description: "Soundproofed booths for private calls." },
  { key: "networking-lounge", name: "Networking Lounge", icon: "Network", description: "A shared lounge for meeting other members and community events." },
];
