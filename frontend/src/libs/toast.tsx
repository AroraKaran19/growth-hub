"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "react-toastify";

export const toastDone = (message: string) => toast.success(message, { autoClose: 4000 });

export const toastFailed = (message: string) => toast.error(message, { autoClose: 6000 });

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-tertiary/20 px-2.5 py-1 text-xs font-medium text-tertiary transition-colors hover:bg-tertiary/5"
    >
      {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
      {copied ? "Copied" : "Copy sign-in details"}
    </button>
  );
};

/** Stays open until closed, since the admin has to pass the password on. */
export const toastInvited = ({ email, password, portal }: { email: string; password: string; portal: "admin" | "partner" }) => {
  const place = portal === "admin" ? "the admin panel" : "the venue portal";
  const details = [
    `Sign in to Growth Hub at ${window.location.origin}/${portal}/login`,
    `Email: ${email}`,
    `Temporary password: ${password}`,
    "You'll choose your own password after signing in.",
  ].join("\n");
  toast.success(
    <div className="text-sm">
      <p>
        {email} can now sign in to {place} with the temporary password{" "}
        <span className="font-mono font-semibold">{password}</span>. They&apos;ll choose their own after signing in.
      </p>
      <CopyButton text={details} />
    </div>,
    { autoClose: false, closeOnClick: false },
  );
};
