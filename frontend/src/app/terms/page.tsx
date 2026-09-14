import type { Metadata } from "next";
import LegalPage from "../(pages)/Legal/LegalPage";
import { LEGAL_DOCUMENTS } from "@/data/legal";

export const metadata: Metadata = {
  title: LEGAL_DOCUMENTS.terms.title,
  description: LEGAL_DOCUMENTS.terms.summary,
};

export default function Terms() {
  return <LegalPage id="terms" />;
}
