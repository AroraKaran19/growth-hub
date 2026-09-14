"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import OtpInput, { emptyCode } from "@/app/components/ui/form/OtpInput";
import { publicApi } from "@/libs/api/client";
import { authErrorMessage, readAuthError, retryAfterSeconds } from "@/libs/auth/errors";
import {
  buildAttempt,
  clearAttempt,
  isRestorable,
  readAttempt,
  secondsUntil,
  writeAttempt,
} from "@/libs/auth/otpAttempt";
import { signInThroughRelay } from "@/libs/auth/requests";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/utils";

const CODE_LENGTH = 6;

const INPUT =
  "w-full rounded-lg border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const PRIMARY_BUTTON =
  "cta-gradient mt-5 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

type EmailCodeSignInProps = {
  surface: "partner" | "admin";
  next: string;
};

const HEADINGS = {
  partner: {
    title: "Partner sign in",
    subtitle: "For venue staff managing check-ins and seats.",
    label: "Work email",
  },
  admin: {
    title: "Admin sign in",
    subtitle: "For the Growth Hub operations team.",
    label: "Work email",
  },
} as const;

const EmailCodeSignIn = ({ surface, next }: EmailCodeSignInProps) => {
  const router = useRouter();
  const status = useAuthStore(surface, (state) => state.status);
  const account = useAuthStore(surface, (state) => state.account);
  const applySignIn = useAuthStore(surface, (state) => state.applySignIn);

  // Seeded once, so a refresh lands back on the boxes without a setState in an
  // effect. Null on the server, and the form only renders once status settles.
  const [restored] = useState(() => {
    const attempt = readAttempt(surface);
    return isRestorable(attempt, surface) ? attempt : null;
  });

  const [step, setStep] = useState<"email" | "code">(restored ? "code" : "email");
  const [email, setEmail] = useState(restored?.identifier ?? "");
  const [code, setCode] = useState<string[]>(() => emptyCode(CODE_LENGTH));
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    restored ? secondsUntil(restored.cooldownEndsAt) : 0,
  );
  const [busy, setBusy] = useState(false);

  const copy = HEADINGS[surface];

  useEffect(() => {
    if (status === "authenticated" && account) router.replace(next);
  }, [status, account, next, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const requestCode = async () => {
    const { data } = await publicApi.post(`/auth/${surface}/email/request`, { email: email.trim() });
    return Number(data?.data?.cooldownSeconds ?? 60);
  };

  const startCountdown = (seconds: number) => {
    setSecondsLeft(seconds);
    writeAttempt(buildAttempt(surface, email.trim(), seconds));
  };

  /**
   * A throttle means a code went out moments ago, so carry on to the boxes and
   * count down there. A spent send cap means no code is coming, so stay put.
   */
  const handleRequestFailure = (caught: unknown, atCodeStep: boolean) => {
    const info = readAuthError(caught);
    if (info.code === "OTP_THROTTLED") {
      startCountdown(retryAfterSeconds(info));
      if (!atCodeStep) {
        setCode(emptyCode(CODE_LENGTH));
        setStep("code");
      }
      return;
    }
    setError(authErrorMessage(info));
  };

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cooldown = await requestCode();
      setCode(emptyCode(CODE_LENGTH));
      startCountdown(cooldown);
      setStep("code");
    } catch (caught) {
      handleRequestFailure(caught, false);
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setBusy(true);
    setError(null);
    try {
      const cooldown = await requestCode();
      setCode(emptyCode(CODE_LENGTH));
      startCountdown(cooldown);
    } catch (caught) {
      handleRequestFailure(caught, true);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    const entered = code.join("");
    if (entered.length < CODE_LENGTH) {
      setError(`Enter all ${CODE_LENGTH} digits.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await signInThroughRelay(surface, { email: email.trim(), code: entered });
      applySignIn(payload);
      clearAttempt(surface);
      router.replace(next);
    } catch (caught) {
      setError(authErrorMessage(readAuthError(caught)));
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") {
    return <div className="h-96 animate-pulse rounded-2xl bg-surface" />;
  }

  return (
    <div>
      {step === "email" ? (
        <>
          <h1 className="text-2xl font-bold text-tertiary">{copy.title}</h1>
          <p className="mt-1 text-sm text-tertiary/60">{copy.subtitle}</p>

          <form onSubmit={handleRequest} noValidate className="mt-6">
            <label
              htmlFor={`${surface}-email`}
              className="mb-1.5 block text-sm font-medium text-tertiary"
            >
              {copy.label}
            </label>
            <input
              id={`${surface}-email`}
              name="email"
              type="email"
              autoComplete="username"
              placeholder="Your work email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              className={cn(INPUT, error ? "border-primary" : "border-tertiary/20")}
            />
            <button
              type="submit"
              disabled={busy || secondsLeft > 0}
              className={PRIMARY_BUTTON}
            >
              {busy ? "Sending..." : secondsLeft > 0 ? `Wait ${secondsLeft}s` : "Send code"}
            </button>
          </form>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              clearAttempt(surface);
              setSecondsLeft(0);
              setStep("email");
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 text-sm text-tertiary/60 transition-colors hover:text-tertiary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Change email
          </button>

          <h1 className="mt-4 text-2xl font-bold text-tertiary">Enter the code</h1>
          <p className="mt-1 text-sm text-tertiary/60">
            If {email.trim()} has an account, a {CODE_LENGTH}-digit code is on its way.
          </p>

          <form onSubmit={handleVerify} noValidate className="mt-6">
            <OtpInput
              length={CODE_LENGTH}
              value={code}
              onChange={(nextCode) => {
                setCode(nextCode);
                setError(null);
              }}
              disabled={busy}
              invalid={Boolean(error)}
              autoFocus
              label="Sign-in code"
            />
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
              {busy ? "Checking..." : "Verify and continue"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-tertiary/60">
            {secondsLeft > 0 ? (
              `Resend code in 0:${String(secondsLeft).padStart(2, "0")}`
            ) : (
              <>
                Didn&apos;t get it?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={busy}
                  className="font-medium text-primary transition-opacity hover:opacity-75 disabled:opacity-50"
                >
                  Resend code
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

export default EmailCodeSignIn;
