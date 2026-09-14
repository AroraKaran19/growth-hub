"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OtpInput, { emptyCode } from "@/app/components/ui/form/OtpInput";
import SelectField from "@/app/components/ui/form/SelectField";
import { COUNTRY_CODE_OPTIONS } from "@/data/profileOptions";
import { MSG91_CAPTCHA_ID, useMsg91Widget } from "@/hooks/useMsg91Widget";
import { memberApi, publicApi } from "@/libs/api/client";
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
import type { MemberAccount } from "@/types/auth";
import { cn } from "@/utils";

const OTP_LENGTH = 4;
const MOBILE_DIGITS = 10;

const FIELD_LABEL = "mb-1.5 block text-sm font-medium text-tertiary";
const INPUT =
  "w-full rounded-lg border border-tertiary/20 bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 hover:border-tertiary/35 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const PRIMARY_BUTTON =
  "cta-gradient mt-5 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const TEST_PHONE = process.env.NEXT_PUBLIC_AUTH_TEST_PHONE ?? "";

type PhoneSignInProps = {
  title?: string;
  subtitle?: string;
  /** h1 on the login page, h2 where the page already owns the h1. */
  headingTag?: "h1" | "h2";
  /** Runs once the member is signed in and has a name. */
  onComplete?: () => void;
};

/**
 * Phone, code and name steps for member sign-in. Used by the login page and
 * inline at checkout, so a visitor can verify without losing their booking.
 */
const PhoneSignIn = ({
  title = "Log in or sign up",
  subtitle = "Use your mobile number and we will text you a one-time code.",
  headingTag = "h2",
  onComplete,
}: PhoneSignInProps) => {
  const applySignIn = useAuthStore("member", (state) => state.applySignIn);
  const setAccount = useAuthStore("member", (state) => state.setAccount);
  const widget = useMsg91Widget();

  // Seeded once, so a refresh lands back on the boxes without a setState in an
  // effect.
  const [restored] = useState(() => {
    const attempt = readAttempt("member");
    return isRestorable(attempt, "member") ? attempt : null;
  });

  const [step, setStep] = useState<"phone" | "otp" | "onboarding">(
    restored ? "otp" : "phone",
  );
  const [countryCode, setCountryCode] = useState(restored?.countryCode ?? "+91");
  const [mobile, setMobile] = useState(restored?.identifier ?? "");
  const [code, setCode] = useState<string[]>(() => emptyCode(OTP_LENGTH));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    restored ? secondsUntil(restored.cooldownEndsAt) : 0,
  );
  const [busy, setBusy] = useState(false);

  const Heading = headingTag;
  const e164 = `${countryCode}${mobile}`;
  const isTestPhone = Boolean(TEST_PHONE) && e164 === TEST_PHONE;
  // Say so before they type a number, rather than failing at send time.
  const widgetBlocked = widget.status === "unavailable" && !isTestPhone;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const claim = async () => {
    const { data } = await publicApi.post("/auth/member/otp/claim", {
      countryCode,
      phoneNumber: mobile,
    });
    return Number(data?.data?.cooldownSeconds ?? 60);
  };

  const startCountdown = (seconds: number) => {
    setSecondsLeft(seconds);
    writeAttempt(buildAttempt("member", mobile, seconds, countryCode));
  };

  /**
   * A throttle means a code went out moments ago, so carry on to the boxes and
   * count down there. A spent send cap means no code is coming, so stay put.
   */
  const handleSendFailure = (caught: unknown, atCodeStep: boolean) => {
    const info = readAuthError(caught);
    if (info.code === "OTP_THROTTLED") {
      startCountdown(retryAfterSeconds(info));
      if (!atCodeStep) {
        setCode(emptyCode(OTP_LENGTH));
        setStep("otp");
      }
      return;
    }
    setError(authErrorMessage(info));
  };

  const handleSendCode = async (event: FormEvent) => {
    event.preventDefault();
    if (mobile.length !== MOBILE_DIGITS && countryCode === "+91") {
      setError(`Enter your ${MOBILE_DIGITS}-digit mobile number.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cooldown = await claim();
      if (!isTestPhone) await widget.sendOtp(e164.replace(/\D/g, ""));
      setCode(emptyCode(OTP_LENGTH));
      startCountdown(cooldown);
      setStep("otp");
    } catch (caught) {
      handleSendFailure(caught, false);
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setBusy(true);
    setError(null);
    try {
      const cooldown = await claim();
      if (!isTestPhone) await widget.retryOtp();
      setCode(emptyCode(OTP_LENGTH));
      startCountdown(cooldown);
    } catch (caught) {
      handleSendFailure(caught, true);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    const entered = code.join("");
    if (entered.length < OTP_LENGTH && !isTestPhone) {
      setError(`Enter all ${OTP_LENGTH} digits.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const msg91Token = isTestPhone ? "" : await widget.verifyOtp(entered);
      const payload = await signInThroughRelay("member", {
        countryCode,
        phoneNumber: mobile,
        msg91Token,
      });
      applySignIn(payload);
      clearAttempt("member");
      if (payload.account.needsOnboarding) {
        setStep("onboarding");
        return;
      }
      onComplete?.();
    } catch (caught) {
      setError(authErrorMessage(readAuthError(caught)));
    } finally {
      setBusy(false);
    }
  };

  const handleOnboarding = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data } = await memberApi.patch("/members/me", {
        name: name.trim(),
        email: email.trim(),
      });
      setAccount(data.data.account as MemberAccount);
      onComplete?.();
    } catch (caught) {
      setError(authErrorMessage(readAuthError(caught)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {step === "phone" && (
        <>
          <Heading className="text-2xl font-bold text-tertiary">{title}</Heading>
          <p className="mt-1 text-sm text-tertiary/60">{subtitle}</p>

          <form onSubmit={handleSendCode} noValidate className="mt-6">
            <label htmlFor="signin-mobile" className={FIELD_LABEL}>
              Mobile number
            </label>
            <div className="flex gap-2">
              <SelectField
                label="Country code"
                hideLabel
                value={countryCode}
                onChange={setCountryCode}
                options={COUNTRY_CODE_OPTIONS}
                className="w-28 shrink-0"
              />
              <input
                id="signin-mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit number"
                value={mobile}
                onChange={(event) => {
                  setMobile(event.target.value.replace(/\D/g, "").slice(0, 14));
                  setError(null);
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "signin-error" : undefined}
                className={cn(INPUT, "min-w-0")}
              />
            </div>
            {widgetBlocked && (
              <p role="alert" className="mt-3 text-sm text-primary">
                Phone sign-in is unavailable right now. Please try again shortly.
              </p>
            )}
            <button
              type="submit"
              disabled={busy || secondsLeft > 0 || widgetBlocked}
              className={PRIMARY_BUTTON}
            >
              {busy ? "Sending..." : secondsLeft > 0 ? `Wait ${secondsLeft}s` : "Send OTP"}
            </button>
          </form>
        </>
      )}

      {step === "otp" && (
        <>
          <button
            type="button"
            onClick={() => {
              clearAttempt("member");
              setSecondsLeft(0);
              setStep("phone");
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 text-sm text-tertiary/60 transition-colors hover:text-tertiary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Change number
          </button>

          <Heading className="mt-4 text-2xl font-bold text-tertiary">
            Enter the code
          </Heading>
          <p className="mt-1 text-sm text-tertiary/60">
            We sent a {OTP_LENGTH}-digit code to {countryCode} {mobile}.
          </p>

          <form onSubmit={handleVerify} noValidate className="mt-6">
            <OtpInput
              length={OTP_LENGTH}
              value={code}
              onChange={(nextCode) => {
                setCode(nextCode);
                setError(null);
              }}
              disabled={busy}
              invalid={Boolean(error)}
              autoFocus
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

      {step === "onboarding" && (
        <>
          <Heading className="text-2xl font-bold text-tertiary">
            Tell us your name
          </Heading>
          <p className="mt-1 text-sm text-tertiary/60">
            It goes on your bookings and invoices.
          </p>

          <form onSubmit={handleOnboarding} noValidate className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="onboarding-name" className={FIELD_LABEL}>
                Full name
              </label>
              <input
                id="onboarding-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                aria-invalid={Boolean(error)}
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="onboarding-email" className={FIELD_LABEL}>
                Email <span className="font-normal text-tertiary/50">(optional)</span>
              </label>
              <input
                id="onboarding-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Your email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
                aria-describedby="onboarding-email-hint"
                className={INPUT}
              />
              <p id="onboarding-email-hint" className="mt-1.5 text-xs text-tertiary/55">
                Add it to get booking confirmations and updates.
              </p>
            </div>
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
              {busy ? "Saving..." : "Continue"}
            </button>
          </form>
        </>
      )}

      {error && (
        <p id="signin-error" role="alert" className="mt-3 text-sm text-primary">
          {error}
        </p>
      )}

      {/* MSG91 renders its captcha here when the widget asks for one. */}
      <div id={MSG91_CAPTCHA_ID} />

      <p className="mt-4 text-xs text-tertiary/50">
        By continuing you agree to our{" "}
        <Link href="/terms" className="font-medium text-tertiary underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-tertiary underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
};

export default PhoneSignIn;
