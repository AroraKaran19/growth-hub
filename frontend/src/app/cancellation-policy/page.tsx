import type { Metadata } from "next";
import LegalPage from "../(pages)/Legal/LegalPage";
import { LEGAL_DOCUMENTS } from "@/data/legal";

export const metadata: Metadata = {
  title: LEGAL_DOCUMENTS["cancellation-policy"].title,
  description: LEGAL_DOCUMENTS["cancellation-policy"].summary,
};

export default function CancellationPolicy() {
  return <LegalPage id="cancellation-policy" />;
}
