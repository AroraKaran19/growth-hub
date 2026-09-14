import type { Metadata } from "next";
import LegalPage from "../(pages)/Legal/LegalPage";
import { LEGAL_DOCUMENTS } from "@/data/legal";

export const metadata: Metadata = {
  title: LEGAL_DOCUMENTS.privacy.title,
  description: LEGAL_DOCUMENTS.privacy.summary,
};

export default function Privacy() {
  return <LegalPage id="privacy" />;
}
