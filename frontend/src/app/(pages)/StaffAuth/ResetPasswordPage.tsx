"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CircleCheck, KeyRound } from "lucide-react";
import Logo from "@/app/components/ui/Logo";
import PasswordInput from "@/app/components/ui/form/PasswordInput";
import { publicApi } from "@/libs/api/client";
import { readApiError } from "@/libs/api/errors";
import { authErrorMessage } from "@/libs/auth/errors";
import { passwordProblem } from "@/utils/password";

type ResetPasswordPageProps = {
  surface: "partner" | "admin";
};

const LABELS = { partner: "Partner portal", admin: "Admin panel" } as const;

const ResetPasswordPage = ({ surface }: ResetPasswordPageProps) => {
  const token = useRef("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // The token rides in the fragment so it never reaches a server log; drop it from the bar once read.
  useEffect(() => {
    token.current = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token.current) return setError("This link is incomplete. Ask for a new one from the sign-in page.");
    const problem = passwordProblem(newPassword);
    if (problem) return setError(problem);
    if (newPassword !== confirmation) return setError("The two passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      await publicApi.post(`/auth/${surface}/password/reset`, { token: token.current, newPassword });
      setIsDone(true);
    } catch (caught) {
      setError(authErrorMessage(readApiError(caught)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-secondary shadow-xl shadow-tertiary/10">
        <div className="relative overflow-hidden bg-tertiary px-6 py-6 text-secondary sm:px-8">
          <div aria-hidden="true" className="cta-banner absolute -right-16 -top-20 size-56 rounded-full opacity-40 blur-3xl" />
          <Link href="/" aria-label="Growth Hub home" className="relative block w-fit">
            <Logo className="h-9 w-auto text-secondary" />
          </Link>
          <p className="badge-gradient relative mt-4 w-fit rounded-full px-3 py-1 text-xs font-semibold">
            {LABELS[surface]}
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {isDone ? (
            <>
              <span className="flex size-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <CircleCheck aria-hidden="true" className="size-5" />
              </span>
              <h1 className="mt-4 text-2xl font-bold text-tertiary">Password updated</h1>
              <p className="mt-1 text-sm text-tertiary/60">
                Every device that was signed in has been signed out. Sign in with your new password.
              </p>
              <Link
                href={`/${surface}/login`}
                className="cta-gradient mt-6 block w-full rounded-lg px-5 py-3 text-center text-sm font-medium text-secondary transition-opacity hover:opacity-90"
              >
                Go to sign in
              </Link>
            </>
          ) : (
            <>
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <KeyRound aria-hidden="true" className="size-5" />
              </span>
              <h1 className="mt-4 text-2xl font-bold text-tertiary">Choose a new password</h1>
              <p className="mt-1 text-sm text-tertiary/60">This link works once, for 30 minutes after it was sent.</p>

              <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
                <PasswordInput
                  id="reset-new-password"
                  label="New password"
                  value={newPassword}
                  onChange={(value) => {
                    setNewPassword(value);
                    setError(null);
                  }}
                  autoComplete="new-password"
                  hint="At least 10 characters. A short phrase works well."
                  invalid={Boolean(error)}
                  autoFocus
                  required
                />
                <PasswordInput
                  id="reset-confirm-password"
                  label="Type it again"
                  value={confirmation}
                  onChange={(value) => {
                    setConfirmation(value);
                    setError(null);
                  }}
                  autoComplete="new-password"
                  invalid={Boolean(error)}
                  required
                />
                {error && (
                  <p role="alert" className="text-sm text-primary">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="cta-gradient mt-2 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Save new password"}
                </button>
              </form>
              <Link href={`/${surface}/login`} className="mt-4 block text-center text-sm text-tertiary/60 hover:text-tertiary">
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
