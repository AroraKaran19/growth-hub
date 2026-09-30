import {
  Coffee,
  Network,
  Phone,
  Plug,
  Printer,
  ShieldCheck,
  Snowflake,
  SquareParking,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import catalogue from "@/config/catalogue-ids.json";

export type Amenity = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const AMENITIES: Amenity[] = [
  {
    id: "wifi",
    label: "High-Speed Wi-Fi",
    description:
      "Stay Connected With Fast, Reliable Internet For Uninterrupted Work.",
    icon: Wifi,
  },
  {
    id: "cafe",
    label: "Café & Refreshments",
    description:
      "Enjoy Unlimited Freshly Brewed Coffee And Tea Throughout The Day.",
    icon: Coffee,
  },
  {
    id: "meeting-rooms",
    label: "Meeting Rooms",
    description:
      "Book Fully Equipped Rooms For Client Calls, Interviews And Workshops.",
    icon: Users,
  },
  {
    id: "printing",
    label: "Printing & Scanning",
    description:
      "Convenient Printing And Scanning Facilities Whenever You Need Them.",
    icon: Printer,
  },
  {
    id: "parking",
    label: "Dedicated Parking",
    description:
      "Hassle-Free Parking For Cars And Two-Wheelers At Selected Locations.",
    icon: SquareParking,
  },
  {
    id: "air-conditioning",
    label: "Air-Conditioned Spaces",
    description:
      "Climate-Controlled Floors That Stay Comfortable Through The Day.",
    icon: Snowflake,
  },
  {
    id: "power-backup",
    label: "Power Backup",
    description:
      "Full Power Backup So An Outage Never Interrupts Your Working Day.",
    icon: Plug,
  },
  {
    id: "secure-access",
    label: "Secure Access",
    description:
      "Keycard Entry And On-Site Security, With Access Logged Around The Clock.",
    icon: ShieldCheck,
  },
  {
    id: "phone-booths",
    label: "Phone Booths",
    description:
      "Soundproofed Booths For Private Calls Without Leaving Your Desk.",
    icon: Phone,
  },
  {
    id: "networking-lounge",
    label: "Networking Lounge",
    description:
      "A Shared Lounge For Meeting Other Members And Regular Community Events.",
    icon: Network,
  },
];

if (AMENITIES.map((amenity) => amenity.id).join() !== catalogue.amenities.join()) {
  throw new Error("AMENITIES must list the ids in config/catalogue-ids.json, in order");
}
