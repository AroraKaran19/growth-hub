"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Crown, QrCode, TicketPercent } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { MEMBER } from "@/data/member";
import { COUNTRY_CODE_OPTIONS } from "@/data/profileOptions";
import { useSession } from "@/stores/session";
import { cn } from "@/utils";

const OTP_LENGTH = 6;
const MOBILE_DIGITS = 10;
const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 5;
// MOCK: the only code the simulated SMS ever sends.
const DEMO_OTP = "123456";

const BENEFITS = [
  {
    icon: QrCode,
    title: "Check in with a QR",
    text: "Every booking comes with a code for reception.",
  },
  {
    icon: Crown,
    title: "Reserve your seat",
    text: "Memberships hold the same desk for you every day.",
  },
  {
    icon: TicketPercent,
    title: "Offers in one place",
    text: "Coupons are ready to apply at checkout.",
  },
];

const FIELD_LABEL = "mb-1.5 block text-sm font-medium text-tertiary";
const INPUT =
  "w-full rounded-lg border border-tertiary/20 bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 hover:border-tertiary/35 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const PRIMARY_BUTTON =
  "cta-gradient mt-5 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

/** Only same-site paths, so a crafted link can't bounce members elsewhere. */
const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";

const emptyOtp = () => Array<string>(OTP_LENGTH).fill("");

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { session, isReady, signIn } = useSession();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otp, setOtp] = useState<string[]>(emptyOtp);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isLocked = attempts >= MAX_ATTEMPTS;

  // Signing in, or arriving already signed in, goes straight on.
  useEffect(() => {
    if (isReady && session) router.replace(next);
  }, [isReady, session, next, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const startOtp = () => {
    setOtp(emptyOtp());
    setOtpError(null);
    setAttempts(0);
    setSecondsLeft(RESEND_SECONDS);
  };

  const handleSendCode = (event: FormEvent) => {
    event.preventDefault();
    if (mobile.length !== MOBILE_DIGITS) {
      setPhoneError(`Enter your ${MOBILE_DIGITS}-digit mobile number.`);
      return;
    }
    setPhoneError(null);
    startOtp();
    setStep("otp");
  };

  const handleResend = () => {
    startOtp();
    otpRefs.current[0]?.focus();
  };

  const fillFrom = (index: number, digits: string) => {
    setOtp((current) => {
      const updated = [...current];
      digits
        .slice(0, OTP_LENGTH - index)
        .split("")
        .forEach((digit, offset) => {
          updated[index + offset] = digit;
        });
      return updated;
    });
    otpRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus();
    setOtpError(null);
  };

  const handleDigitChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");

    if (!digits) {
      setOtp((current) => current.map((value, i) => (i === index ? "" : value)));
      return;
    }

    // An SMS autofill lands the whole code in one box.
    if (digits.length >= OTP_LENGTH - index && digits.length > 1) {
      fillFrom(index, digits);
      return;
    }

    fillFrom(index, digits.slice(-1));
  };

  const handleDigitKey = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      event.preventDefault();
      setOtp((current) =>
        current.map((value, i) => (i === index - 1 ? "" : value)),
      );
      otpRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "");
    if (digits) fillFrom(index, digits);
  };

  const handleVerify = (event: FormEvent) => {
    event.preventDefault();
    if (isLocked) return;

    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setOtpError(`Enter all ${OTP_LENGTH} digits.`);
      return;
    }

    if (code !== DEMO_OTP) {
      const used = attempts + 1;
      const left = MAX_ATTEMPTS - used;
      setAttempts(used);
      setOtpError(
        left <= 0
          ? "Too many incorrect attempts. Request a new code."
          : `That code is incorrect. ${left} ${left === 1 ? "try" : "tries"} left.`,
      );
      return;
    }

    signIn({
      name: MEMBER.name,
      method: "phone",
      phone: `${countryCode} ${mobile}`,
      signedInAt: new Date().toISOString(),
    });
  };

  const handleGoogle = () =>
    signIn({
      name: MEMBER.name,
      method: "google",
      email: MEMBER.email,
      signedInAt: new Date().toISOString(),
    });

  if (!isReady || session) {
    return <div className="h-80 animate-pulse rounded-2xl bg-surface" />;
  }

  return (
    <div>
      {step === "phone" ? (
        <>
          <h1 className="text-2xl font-bold text-tertiary">Log in or sign up</h1>
          <p className="mt-1 text-sm text-tertiary/60">
            Use your mobile number and we will text you a one-time code.
          </p>

          <form onSubmit={handleSendCode} noValidate className="mt-6">
            <label htmlFor="login-mobile" className={FIELD_LABEL}>
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
                id="login-mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit number"
                value={mobile}
                onChange={(event) => {
                  setMobile(
                    event.target.value.replace(/\D/g, "").slice(0, MOBILE_DIGITS),
                  );
                  setPhoneError(null);
                }}
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? "login-mobile-error" : undefined}
                className={cn(INPUT, "min-w-0")}
              />
            </div>
            {phoneError && (
              <p
                id="login-mobile-error"
                role="alert"
                className="mt-2 text-sm text-primary"
              >
                {phoneError}
              </p>
            )}
            <button type="submit" className={PRIMARY_BUTTON}>
              Send OTP
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-tertiary/45">
            <span aria-hidden="true" className="h-px grow bg-tertiary/10" />
            or
            <span aria-hidden="true" className="h-px grow bg-tertiary/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-tertiary/20 px-4 py-3 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="inline-flex items-center gap-1.5 text-sm text-tertiary/60 transition-colors hover:text-tertiary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Change number
          </button>

          <h1 className="mt-4 text-2xl font-bold text-tertiary">Enter the code</h1>
          <p className="mt-1 text-sm text-tertiary/60">
            We sent a {OTP_LENGTH}-digit code to {countryCode} {mobile}.
          </p>

          <form onSubmit={handleVerify} noValidate className="mt-6">
            <fieldset>
              <legend className="sr-only">One-time code</legend>
              <div className="flex justify-between gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    autoFocus={index === 0}
                    aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                    aria-invalid={Boolean(otpError)}
                    value={digit}
                    disabled={isLocked}
                    onChange={(event) =>
                      handleDigitChange(index, event.target.value)
                    }
                    onKeyDown={(event) => handleDigitKey(index, event)}
                    onPaste={(event) => handlePaste(index, event)}
                    onFocus={(event) => event.target.select()}
                    className="size-12 rounded-lg border border-tertiary/20 bg-secondary text-center text-lg font-semibold text-tertiary outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:bg-tertiary/4 sm:size-14"
                  />
                ))}
              </div>
            </fieldset>

            {otpError && (
              <p role="alert" className="mt-3 text-sm text-primary">
                {otpError}
              </p>
            )}

            <button type="submit" disabled={isLocked} className={PRIMARY_BUTTON}>
              Verify and continue
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
                  className="font-medium text-primary transition-opacity hover:opacity-75"
                >
                  Resend code
                </button>
              </>
            )}
          </p>
        </>
      )}

      <p className="mt-6 rounded-lg bg-tertiary/4 px-3 py-2 text-xs text-tertiary/55">
        Sign-in is simulated: the code is always {DEMO_OTP}, and Google signs
        you in as the demo member.
      </p>
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

const LoginPage = () => {
  return (
    <section className="bg-surface px-4 pb-16 pt-28 sm:px-6 lg:pt-32">
      <div className="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-tertiary/10 bg-secondary lg:grid-cols-2">
        <div className="relative hidden min-h-[600px] lg:block">
          <Image
            src="/assets/home/hero-bg.webp"
            alt=""
            fill
            sizes="(min-width: 1024px) 50vw, 0px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-tertiary/90 via-tertiary/55 to-tertiary/20" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-secondary">
            <h2 className="text-3xl font-semibold tracking-tight">
              Work better. Book smarter.
            </h2>
            <p className="mt-2 max-w-md text-sm text-secondary/80">
              One account for passes, memberships and every partner venue in
              Bangalore.
            </p>
            <ul className="mt-7 flex flex-col gap-4">
              {BENEFITS.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <li key={benefit.title} className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/15">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">
                        {benefit.title}
                      </span>
                      <span className="text-sm text-secondary/75">
                        {benefit.text}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* useSearchParams needs a Suspense boundary or the production
                build fails on this statically rendered route. */}
            <Suspense
              fallback={<div className="h-80 animate-pulse rounded-2xl bg-surface" />}
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
