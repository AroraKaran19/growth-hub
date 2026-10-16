"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import PasswordInput from "@/app/components/ui/form/PasswordInput";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { publicApi } from "@/libs/api/client";
import { readApiError } from "@/libs/api/errors";
import { authErrorMessage, readAuthError } from "@/libs/auth/errors";
import { adminDestination } from "@/config/adminPermissions";
import { changePasswordThroughRelay, signInThroughRelay } from "@/libs/auth/requests";
import { authStoreFor, useAuthStore } from "@/stores/auth";
import type { AuthAccount } from "@/types/auth";
import { cn } from "@/utils";
import { passwordProblem } from "@/utils/password";

const INPUT =
  "w-full rounded-lg border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const PRIMARY_BUTTON =
  "cta-gradient mt-6 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const QUIET_LINK = "text-sm font-medium text-primary transition-opacity hover:opacity-75 disabled:opacity-50";

type Step = "sign-in" | "change" | "forgot" | "sent";

type StaffPasswordSignInProps = {
  surface: "partner" | "admin";
  next: string;
};

const HEADINGS = {
  partner: { title: "Partner sign in", subtitle: "For venue staff managing check-ins and seats." },
  admin: { title: "Admin sign in", subtitle: "For the Growth Hub operations team." },
} as const;

const isEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

const StaffPasswordSignIn = ({ surface, next }: StaffPasswordSignInProps) => {
  const router = useRouter();
  const status = useAuthStore(surface, (state) => state.status);
  const account = useAuthStore(surface, (state) => state.account);
  const applySignIn = useAuthStore(surface, (state) => state.applySignIn);

  const [step, setStep] = useState<Step>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  // Admins land on a page they may open, so a partial permission set never bounces twice.
  const destination = (signedIn: AuthAccount | null = authStoreFor(surface).getState().account) =>
    signedIn?.type === "admin" ? adminDestination(signedIn, next) : next;

  useEffect(() => {
    if (status !== "authenticated" || !account) return;
    router.replace(account.type === "admin" ? adminDestination(account, next) : next);
  }, [status, account, next, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const goTo = (target: Step) => {
    setStep(target);
    setError(null);
    setNewPassword("");
    setConfirmation("");
  };

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!isEmail(email)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setBusy(true);
    setError(null);
    try {
      applySignIn(await signInThroughRelay(surface, { email: email.trim(), password }));
      router.replace(destination());
    } catch (caught) {
      const info = readAuthError(caught);
      if (info.code === "PASSWORD_CHANGE_REQUIRED") goTo("change");
      else setError(authErrorMessage(info));
    } finally {
      setBusy(false);
    }
  };

  const handleChange = async (event: FormEvent) => {
    event.preventDefault();
    const problem = passwordProblem(newPassword);
    if (problem) return setError(problem);
    if (newPassword !== confirmation) return setError("The two passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      applySignIn(await changePasswordThroughRelay(surface, { email: email.trim(), password, newPassword }));
      router.replace(destination());
    } catch (caught) {
      setError(authErrorMessage(readAuthError(caught)));
    } finally {
      setBusy(false);
    }
  };

  const sendResetLink = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await publicApi.post(`/auth/${surface}/password/forgot`, { email: email.trim() });
      setSecondsLeft(Number(data?.data?.cooldownSeconds ?? 60));
      setStep("sent");
    } catch (caught) {
      const info = readApiError(caught);
      // A link went out moments ago, so the inbox is still the right place to look.
      if (info.code === "OTP_THROTTLED") {
        setSecondsLeft(Number(info.meta.retryAfterSeconds ?? 60));
        setStep("sent");
      } else if (info.code === "OTP_SEND_LIMIT") {
        setError(`Too many reset emails. Try again in ${Number(info.meta.retryAfterMinutes ?? 15)} minutes.`);
      } else {
        setError(authErrorMessage(info));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = (event: FormEvent) => {
    event.preventDefault();
    if (!isEmail(email)) return setError("Enter a valid email address.");
    void sendResetLink();
  };

  if (status === "loading") {
    return <div className="h-96 animate-pulse rounded-2xl bg-surface" />;
  }

  const backLink = (label: string, target: Step) => (
    <button
      type="button"
      onClick={() => goTo(target)}
      className="inline-flex items-center gap-1.5 text-sm text-tertiary/60 transition-colors hover:text-tertiary"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {label}
    </button>
  );

  const emailField = (autoFocus = false) => (
    <div>
      <label htmlFor={`${surface}-email`} className="mb-1.5 block text-sm font-medium text-tertiary">
        Work email
        <RequiredMark />
      </label>
      <input
        id={`${surface}-email`}
        name="email"
        type="email"
        autoComplete="username"
        placeholder="Your work email"
        value={email}
        autoFocus={autoFocus}
        onChange={(event) => {
          setEmail(event.target.value);
          setError(null);
        }}
        aria-required="true"
        aria-invalid={Boolean(error)}
        className={cn(INPUT, error ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35")}
      />
    </div>
  );

  return (
    <div>
      {step === "sign-in" && (
        <>
          <h1 className="text-2xl font-bold text-tertiary">{HEADINGS[surface].title}</h1>
          <p className="mt-1 text-sm text-tertiary/60">{HEADINGS[surface].subtitle}</p>

          <form onSubmit={handleSignIn} noValidate className="mt-6 flex flex-col gap-4">
            {emailField()}
            <div>
              <PasswordInput
                id={`${surface}-password`}
                label="Password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  setError(null);
                }}
                autoComplete="current-password"
                placeholder="Your password"
                invalid={Boolean(error)}
                required
              />
              <div className="mt-2 flex justify-end">
                <button type="button" onClick={() => goTo("forgot")} className={QUIET_LINK}>
                  Forgot password?
                </button>
              </div>
            </div>
            <button type="submit" disabled={busy} className={cn(PRIMARY_BUTTON, "mt-2")}>
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </>
      )}

      {step === "change" && (
        <>
          {backLink("Use a different account", "sign-in")}
          <span className="mt-5 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound aria-hidden="true" className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-tertiary">Choose your own password</h1>
          <p className="mt-1 text-sm text-tertiary/60">
            You signed in with a temporary password. Pick a new one only you know to continue.
          </p>

          <form onSubmit={handleChange} noValidate className="mt-6 flex flex-col gap-4">
            <PasswordInput
              id={`${surface}-new-password`}
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
              id={`${surface}-confirm-password`}
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
            <button type="submit" disabled={busy} className={cn(PRIMARY_BUTTON, "mt-2")}>
              {busy ? "Saving..." : "Save and sign in"}
            </button>
          </form>
        </>
      )}

      {step === "forgot" && (
        <>
          {backLink("Back to sign in", "sign-in")}
          <h1 className="mt-4 text-2xl font-bold text-tertiary">Reset your password</h1>
          <p className="mt-1 text-sm text-tertiary/60">
            Enter your work email and we&apos;ll send you a link to choose a new password.
          </p>
          <form onSubmit={handleForgot} noValidate className="mt-6">
            {emailField(true)}
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
              {busy ? "Sending..." : "Email me a reset link"}
            </button>
          </form>
        </>
      )}

      {step === "sent" && (
        <>
          {backLink("Back to sign in", "sign-in")}
          <span className="mt-5 flex size-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
            <MailCheck aria-hidden="true" className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-tertiary">Check your inbox</h1>
          <p className="mt-1 text-sm text-tertiary/60">
            If {email.trim()} has a {surface} account, a reset link is on its way. It works for 30
            minutes and only once.
          </p>
          <p className="mt-6 text-sm text-tertiary/60">
            {secondsLeft > 0 ? (
              `You can send another in 0:${String(secondsLeft).padStart(2, "0")}`
            ) : (
              <>
                Didn&apos;t get it?{" "}
                <button type="button" onClick={() => void sendResetLink()} disabled={busy} className={QUIET_LINK}>
                  Send it again
                </button>
              </>
            )}
          </p>
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-primary">
          {error}
        </p>
      )}
    </div>
  );
};

export default StaffPasswordSignIn;
