import type { Metadata } from "next";
import CareersPage from "../(pages)/Careers/CareersPage";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Open roles at Growth Hub across partnerships, engineering, design, operations and marketing.",
};

export default function Careers() {
  return <CareersPage />;
}
