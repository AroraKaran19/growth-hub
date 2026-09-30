import { Suspense } from "react";
import type { Metadata } from "next";
import PartnerStatementsPage from "../../../(pages)/Partner/PartnerStatementsPage";

export const metadata: Metadata = {
  title: "Statements",
};

export default function PartnerStatements() {
  return (
    <Suspense fallback={null}>
      <PartnerStatementsPage />
    </Suspense>
  );
}
