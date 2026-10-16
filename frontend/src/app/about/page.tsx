import type { Metadata } from "next";
import { pageMetadata } from "@/libs/seo";
import AboutPage from "../(pages)/About/AboutPage";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("about");

export const revalidate = 300;

export default function About() {
  return <AboutPage />;
}
