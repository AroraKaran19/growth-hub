"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { adminApi, partnerApi } from "@/libs/api/client";
import { readApiError } from "@/libs/api/errors";
import { authErrorMessage, readAuthError } from "@/libs/auth/errors";
import { changePasswordThroughRelay } from "@/libs/auth/requests";
import { toastDone, toastFailed } from "@/libs/toast";
import { authStoreFor, useAuthStore } from "@/stores/auth";
import type { AccountFor } from "@/types/auth";
import { cn } from "@/utils";
import { passwordProblem } from "@/utils/password";
import { PartnerPageHeader as PageHeader } from "../Partner/components/PartnerUi";
import { Field, RAISED, inputClass } from "../Admin/components/venue/fields";

type StaffSurface = "admin" | "partner";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const PasswordInput = ({ id, label, value, onChange, error, autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; error?: string; autoComplete: string }) => {
  const [isShown, setIsShown] = useState(false);
  return (
    <Field id={id} label={label} error={error} required>
      <div className="relative">
        <input
          id={id}
          aria-required="true"
          type={isShown ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass(Boolean(error), "pr-11")}
        />
        <button
          type="button"
          aria-label={isShown ? "Hide password" : "Show password"}
          onClick={() => setIsShown(!isShown)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-tertiary/50 transition-colors hover:text-tertiary"
        >
          {isShown ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
    </Field>
  );
};

type StaffProfilePageProps = {
  surface: StaffSurface;
  roleLabel: string;
  /** What this login can reach: pages for admins, the venue for partners. */
  access: ReactNode;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const StaffProfilePage = ({ surface, roleLabel, access }: StaffProfilePageProps) => {
  const account = useAuthStore(surface, (state) => state.account) as AccountFor<StaffSurface> | null;
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [detailErrors, setDetailErrors] = useState<Partial<Record<"name" | "email" | "emailPassword", string>>>({});
  const [isSavingName, setIsSavingName] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"current" | "next" | "confirm", string>>>({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  if (!account) return null;

  const trimmedEmail = email.trim().toLowerCase();
  const isEmailChanged = trimmedEmail !== account.email;
  const isNameChanged = name.trim() !== account.name;

  const saveDetails = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    const found = {
      ...(trimmed.length < 2 && { name: "Enter a name." }),
      ...(!EMAIL.test(trimmedEmail) && { email: "Enter a valid email address." }),
      ...(isEmailChanged && !emailPassword && { emailPassword: "Enter your current password to change your email." }),
    };
    setDetailErrors(found);
    if (Object.keys(found).length) return;

    setIsSavingName(true);
    try {
      const api = surface === "admin" ? adminApi : partnerApi;
      const { data } = await api.patch<{ data: { account: AccountFor<StaffSurface> } }>("/auth/me", {
        ...(isNameChanged && { name: trimmed }),
        ...(isEmailChanged && { email: trimmedEmail, currentPassword: emailPassword }),
      });
      (authStoreFor(surface).getState().setAccount as (value: AccountFor<StaffSurface>) => void)(data.data.account);
      setEmailPassword("");
      toastDone(isEmailChanged ? "Email changed. Your other devices are signed out." : "Your name is saved.");
    } catch (caught) {
      const info = readApiError(caught);
      if (info.code === "INVALID_CREDENTIALS") setDetailErrors({ emailPassword: "That isn't your current password." });
      else if (info.code === "EMAIL_TAKEN") setDetailErrors({ email: info.message });
      else if (info.fields.name || info.fields.email || info.fields.currentPassword) {
        setDetailErrors({ name: info.fields.name, email: info.fields.email, emailPassword: info.fields.currentPassword });
      } else toastFailed(info.message);
    } finally {
      setIsSavingName(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    const found = {
      ...(!current && { current: "Enter your current password." }),
      ...(passwordProblem(next) && { next: passwordProblem(next)! }),
      ...(next && next === current && { next: "Pick a password different from the current one." }),
      ...(confirm !== next && { confirm: "The passwords don't match." }),
    };
    setErrors(found);
    if (Object.keys(found).length) return;

    setIsSavingPassword(true);
    try {
      const payload = await changePasswordThroughRelay(surface, { email: account.email, password: current, newPassword: next });
      (authStoreFor(surface).getState().applySignIn as (value: typeof payload) => void)(payload);
      setCurrent("");
      setNext("");
      setConfirm("");
      toastDone("Password changed. Your other devices are signed out.");
    } catch (caught) {
      const info = readAuthError(caught);
      if (info.code === "INVALID_CREDENTIALS") setErrors({ current: "That isn't your current password." });
      else if (info.code === "PASSWORD_REUSED") setErrors({ next: info.message });
      else toastFailed(authErrorMessage(info));
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <>
      <PageHeader title="Your profile" description="Your name, how you sign in, and your password." />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <section className="relative overflow-hidden rounded-2xl bg-tertiary p-6 text-secondary shadow-xl shadow-tertiary/15">
            <div aria-hidden="true" className="absolute -right-16 -top-20 size-56 rounded-full bg-primary/35 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-4">
              <span aria-hidden="true" className="cta-gradient flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-bold">
                {initials(account.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold">{account.name}</p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-secondary/65">
                  <Mail aria-hidden="true" className="size-3.5" />
                  {account.email}
                </p>
              </div>
              <span className="badge-gradient ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                {roleLabel}
              </span>
            </div>
            <div className="relative mt-5 border-t border-secondary/12 pt-4">{access}</div>
          </section>

          <form onSubmit={saveDetails} noValidate className={cn(RAISED, "p-5 sm:p-6")}>
            <h2 className="flex items-center gap-2 text-base font-bold text-tertiary">
              <UserRound aria-hidden="true" className="size-4 text-primary" />
              Details
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="profile-name" label="Name" error={detailErrors.name} required>
                <input
                  id="profile-name"
                  aria-required="true"
                  value={name}
                  maxLength={80}
                  onChange={(event) => {
                    setName(event.target.value);
                    setDetailErrors((current) => ({ ...current, name: undefined }));
                  }}
                  className={inputClass(Boolean(detailErrors.name))}
                />
              </Field>
              <Field id="profile-email" label="Email" error={detailErrors.email} required>
                <input
                  id="profile-email"
                  type="email"
                  aria-required="true"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setDetailErrors((current) => ({ ...current, email: undefined, emailPassword: undefined }));
                  }}
                  className={inputClass(Boolean(detailErrors.email))}
                />
                {!detailErrors.email && (
                  <p className="mt-1.5 text-xs text-tertiary/55">You sign in with this, and reset links are sent here.</p>
                )}
              </Field>
            </div>

            {isEmailChanged && (
              <div className="mt-4 animate-[fade-up_0.2s_ease-out_both] rounded-xl bg-surface p-4 motion-reduce:animate-none">
                <PasswordInput
                  id="profile-email-password"
                  label="Current password"
                  value={emailPassword}
                  autoComplete="current-password"
                  error={detailErrors.emailPassword}
                  onChange={(value) => {
                    setEmailPassword(value);
                    setDetailErrors((current) => ({ ...current, emailPassword: undefined }));
                  }}
                />
                <p className="mt-2 text-xs text-tertiary/55">
                  Needed to change your email. Your other devices are signed out; this one stays signed in.
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={isSavingName || (!isNameChanged && !isEmailChanged)}
                className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingName ? "Saving..." : "Save details"}
              </button>
              {isEmailChanged && (
                <button
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setEmailPassword("");
                    setDetailErrors({});
                  }}
                  className="text-sm font-medium text-tertiary/60 transition-colors hover:text-tertiary"
                >
                  Keep {account.email}
                </button>
              )}
            </div>
          </form>
        </div>

        <form onSubmit={savePassword} noValidate className={cn(RAISED, "h-fit p-5 sm:p-6")}>
          <div className="flex items-center gap-3">
            <span className="cta-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-secondary">
              <KeyRound aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-tertiary">Change password</h2>
              <p className="text-sm text-tertiary/55">Signs your other devices out.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-4">
            <PasswordInput id="profile-current" label="Current password" value={current} autoComplete="current-password" error={errors.current} onChange={(value) => { setCurrent(value); setErrors({}); }} />
            <PasswordInput id="profile-next" label="New password" value={next} autoComplete="new-password" error={errors.next} onChange={(value) => { setNext(value); setErrors({}); }} />
            <PasswordInput id="profile-confirm" label="Confirm new password" value={confirm} autoComplete="new-password" error={errors.confirm} onChange={(value) => { setConfirm(value); setErrors({}); }} />
          </div>
          <button
            type="submit"
            disabled={isSavingPassword}
            className="mt-5 w-full rounded-lg bg-tertiary px-5 py-3 text-sm font-medium text-secondary shadow-md shadow-tertiary/20 transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSavingPassword ? "Changing..." : "Change password"}
          </button>
        </form>
      </div>
    </>
  );
};

export default StaffProfilePage;
