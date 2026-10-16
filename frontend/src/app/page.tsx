import type { Metadata } from "next";
import { pageMetadata } from "@/libs/seo";
import Homepage from "./(pages)/Home/Homepage";

export const revalidate = 300;

export const generateMetadata = (): Promise<Metadata> => pageMetadata("home");

export default function Home() {
  return <Homepage />;
}
