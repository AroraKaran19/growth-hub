import { createElement } from "react";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarCheck,
  Clock,
  Coffee,
  CreditCard,
  Globe,
  Handshake,
  Headphones,
  Laptop,
  Leaf,
  Lock,
  MapPin,
  QrCode,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Ticket,
  Users,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import catalog from "./feature-icons.json";

export const FEATURE_ICONS: Record<string, LucideIcon> = {
  Ticket,
  Globe,
  Handshake,
  QrCode,
  Building2,
  MapPin,
  Clock,
  CalendarCheck,
  Users,
  ShieldCheck,
  Wifi,
  Coffee,
  Zap,
  Sparkles,
  Star,
  Briefcase,
  Rocket,
  Smartphone,
  CreditCard,
  Headphones,
  Leaf,
  Lock,
  BadgeCheck,
  Laptop,
};

export const FEATURE_ICON_NAMES: string[] = catalog.icons;

if (FEATURE_ICON_NAMES.join() !== Object.keys(FEATURE_ICONS).join()) {
  throw new Error("FEATURE_ICONS must list the names in config/feature-icons.json, in order");
}

/** Renders a saved icon name; an unknown name falls back to the ticket icon. */
export const FeatureIcon = ({ name, className }: { name: string; className?: string }) =>
  createElement(FEATURE_ICONS[name] ?? Ticket, { "aria-hidden": true, className });
