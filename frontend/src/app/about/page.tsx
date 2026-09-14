import type { Metadata } from "next";
import AboutPage from "../(pages)/About/AboutPage";

export const metadata: Metadata = {
  title: "About",
  description:
    "Growth Hub is a coworking marketplace connecting members with partner venues across Bangalore.",
};

export default function About() {
  return <AboutPage />;
}
