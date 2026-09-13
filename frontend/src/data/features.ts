import {
  Globe,
  Handshake,
  QrCode,
  Ticket,
  type LucideIcon,
} from "lucide-react";

export type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const PLACEHOLDER_COPY =
  "Book your preferred workspace in just a few clicks with real-time availability and instant confirmation.";

export const FEATURES: Feature[] = [
  { title: "Instant Workspace Booking", description: PLACEHOLDER_COPY, icon: Ticket },
  { title: "Flexible Workspaces", description: PLACEHOLDER_COPY, icon: Globe },
  { title: "Premium Locations", description: PLACEHOLDER_COPY, icon: Handshake },
  { title: "Contactless QR Check-in", description: PLACEHOLDER_COPY, icon: QrCode },
  { title: "Enterprise-Grade Amenities", description: PLACEHOLDER_COPY, icon: Globe },
  { title: "Built for Teams & Professionals", description: PLACEHOLDER_COPY, icon: Handshake },
];
