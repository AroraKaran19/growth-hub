"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import BillingDetailsCard from "./components/BillingDetailsCard";

const BillingPage = () => {
  const account = useAuthStore("member", (state) => state.account);
  if (!account) return null;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-tertiary">Billing</h1>
      <p className="mt-1 text-sm text-tertiary/60">
        Invoices are made out to you. For a company invoice, turn on &ldquo;Need a GST invoice for a company?&rdquo; when
        you book; the company saved here fills in for you.
      </p>

      <BillingDetailsCard account={account} className="mt-6" />

      <Link
        href="/account/memberships"
        className="group mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80"
      >
        Change who a membership&apos;s renewals are invoiced to
        <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
};

export default BillingPage;
