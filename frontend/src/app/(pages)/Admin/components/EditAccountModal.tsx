"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { KeyRound, LogOut, X } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import SelectField from "@/app/components/ui/form/SelectField";
import { COUNTRY_CODE_OPTIONS } from "@/data/profileOptions";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed, toastInvited } from "@/libs/toast";
import { cn } from "@/utils";
import { passwordProblem } from "@/utils/password";
import { isValidMobile, nationalDigits } from "@/utils/phone";
import type { AdminRole } from "@/types/auth";
import PermissionPicker from "./team/PermissionPicker";
import RolePicker from "./team/RolePicker";
import TemporaryPasswordField from "./TemporaryPasswordField";
import { BookingsPanel, InvoicesPanel, MembershipsPanel } from "./users/CustomerRecordPanels";
import CustomerTabBar, { panelId, tabId, type CustomerTab } from "./users/CustomerTabBar";

export type AccountChange = {
  name?: string;
  email?: string;
  phone?: { countryCode: string; phoneNumber: string };
  temporaryPassword?: string;
  venueSlug?: string;
  role?: AdminRole;
  permissions?: string[];
};

type Field = keyof AccountChange;

type EditAccountModalProps = {
  portal: "admin" | "partner" | "member";
  /** Customers also get a mobile number field and tabs with their records. */
  account: { id: string; name: string; email: string; phone?: string; countryCode?: string; phoneNumber?: string };
  canEditDetails: boolean;
  venue?: { slug: string; options: { slug: string; name: string; hasAccount?: boolean }[] };
  access?: { permissions: string[]; grantable?: string[] };
  /** Set only when the viewer may change the role. */
  role?: AdminRole;
  onSave: (change: AccountChange) => Promise<void>;
  onClose: () => void;
};

const INPUT =
  "w-full rounded-lg border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const LABEL = "mb-1.5 block text-sm font-medium text-tertiary";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((item) => b.includes(item));

const countryOptions = (current: string) =>
  COUNTRY_CODE_OPTIONS.some((option) => option.value === current)
    ? COUNTRY_CODE_OPTIONS
    : [...COUNTRY_CODE_OPTIONS, { label: current, value: current }];

const EditAccountModal = ({ portal, account, canEditDetails, venue, access, role: currentRole, onSave, onClose }: EditAccountModalProps) => {
  const [role, setRole] = useState(currentRole);
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [venueSlug, setVenueSlug] = useState(venue?.slug ?? "");
  const [permissions, setPermissions] = useState(access?.permissions ?? []);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isResetting, setIsResetting] = useState(false);
  const isCustomer = portal === "member";
  const currentCode = account.countryCode ?? "+91";
  const currentNumber = account.phoneNumber ?? "";
  const [countryCode, setCountryCode] = useState(currentCode);
  const [mobile, setMobile] = useState(currentNumber);
  const [tab, setTab] = useState<CustomerTab>("details");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Capture phase, so an open dropdown's Escape closes only the dropdown.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !dialogRef.current?.querySelector("[aria-expanded='true']")) onClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  const nextEmail = email.trim().toLowerCase();
  const phoneChanged = isCustomer && (countryCode !== currentCode || mobile !== currentNumber);
  const change: AccountChange = {
    ...(canEditDetails && name.trim() !== account.name && { name: name.trim() }),
    ...(canEditDetails && nextEmail !== account.email && { email: nextEmail }),
    ...(canEditDetails && phoneChanged && { phone: { countryCode, phoneNumber: mobile } }),
    ...(canEditDetails && isResetting && password && { temporaryPassword: password }),
    ...(venue && venueSlug !== venue.slug && { venueSlug }),
    ...(role !== currentRole && { role }),
    ...(access && role !== "super-admin" && (role !== currentRole || !sameSet(permissions, access.permissions)) && { permissions }),
  };
  const showsAccess = access && role !== "super-admin";
  const hasChanges = Object.keys(change).length > 0;

  const clearError = (field: Field) => setErrors((current) => ({ ...current, [field]: undefined }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Partial<Record<Field, string>> = {
      ...(change.name !== undefined && change.name.length < 2 && { name: "Enter a name." }),
      ...(change.email !== undefined && !/^\S+@\S+\.\S+$/.test(change.email) && { email: "Enter a valid email address." }),
      ...(change.phone && !isValidMobile(change.phone.phoneNumber, change.phone.countryCode) && { phone: "Enter a valid mobile number." }),
      ...(canEditDetails && isResetting && passwordProblem(password) && { temporaryPassword: passwordProblem(password)! }),
      ...(showsAccess && permissions.length === 0 && { permissions: "Pick at least one section." }),
    };
    setErrors(found);
    if (Object.keys(found).length > 0 || !hasChanges) return;

    setIsSaving(true);
    try {
      await onSave(change);
      const shownName = change.name ?? account.name;
      const venueName = venue?.options.find((option) => option.slug === change.venueSlug)?.name;
      if (change.phone) {
        toastDone(`Saved. ${shownName} now signs in with ${change.phone.countryCode} ${change.phone.phoneNumber} and has been signed out.`);
      } else if (change.temporaryPassword && portal !== "member") {
        toastInvited({ email: change.email ?? account.email, password: change.temporaryPassword, portal });
      } else if (change.email && !isCustomer) {
        toastDone(`Saved. ${shownName} now signs in with ${change.email} and has been signed out.`);
      } else if (change.role) {
        toastDone(`${shownName} is now ${change.role === "super-admin" ? "a super admin" : "an admin"}.`);
      } else if (venueName) {
        toastDone(`${shownName} now manages ${venueName}. They sign in again to see it.`);
      } else {
        toastDone(`${shownName}'s details are saved.`);
      }
      onClose();
    } catch (caught) {
      const info = readApiError(caught);
      if (info.code === "EMAIL_TAKEN") setErrors({ email: "That email already has a Growth Hub account." });
      else if (info.code === "PHONE_TAKEN") setErrors({ phone: "That number already has a Growth Hub account." });
      else if (info.code === "VENUE_HAS_ACCOUNT") setErrors({ venueSlug: info.message });
      else if (Object.keys(info.fields).length > 0) setErrors(info.fields as Partial<Record<Field, string>>);
      else toastFailed(info.message);
      setIsSaving(false);
    }
  };

  const field = (key: Field) => cn(INPUT, errors[key] ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tertiary/50 p-4 sm:items-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`edit-${account.id}-title`}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-secondary shadow-2xl",
          isCustomer ? "max-w-3xl sm:h-[min(44rem,92vh)]" : "max-w-xl",
        )}
      >
        <div className="relative shrink-0 overflow-hidden bg-tertiary px-6 py-5 text-secondary">
          <div aria-hidden="true" className="absolute -right-12 -top-16 size-44 rounded-full bg-primary/40 blur-3xl" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full text-secondary/60 transition-colors hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <div className="relative flex items-center gap-3.5 pr-10">
            <span
              aria-hidden="true"
              className="cta-gradient flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            >
              {initials(account.name)}
            </span>
            <div className="min-w-0">
              <h2 id={`edit-${account.id}-title`} className="text-xl font-bold">
                {canEditDetails ? "Edit details" : "Move venue"}
              </h2>
              <p className="truncate text-sm text-secondary/70">
                {[account.name, account.email || account.phone].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {isCustomer && <CustomerTabBar idPrefix={`edit-${account.id}`} value={tab} onChange={setTab} />}
        </div>

        {isCustomer && tab !== "details" ? (
          <div
            id={panelId(`edit-${account.id}`, tab)}
            role="tabpanel"
            aria-labelledby={tabId(`edit-${account.id}`, tab)}
            className="min-h-0 flex-1 overflow-y-auto bg-tertiary/2 p-4 sm:p-6"
          >
            {tab === "bookings" && <BookingsPanel customerId={account.id} />}
            {tab === "memberships" && <MembershipsPanel customerId={account.id} />}
            {tab === "invoices" && <InvoicesPanel customerId={account.id} />}
          </div>
        ) : (
          <form
            onSubmit={submit}
            noValidate
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            {...(isCustomer && {
              id: panelId(`edit-${account.id}`, "details"),
              role: "tabpanel",
              "aria-labelledby": tabId(`edit-${account.id}`, "details"),
            })}
          >
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
              {canEditDetails && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`edit-${account.id}-name`} className={LABEL}>
                      Name
                      <RequiredMark />
                    </label>
                    <input
                      id={`edit-${account.id}-name`}
                      aria-required="true"
                      value={name}
                      autoFocus
                      onChange={(event) => {
                        setName(event.target.value);
                        clearError("name");
                      }}
                      placeholder="Their full name"
                      className={field("name")}
                    />
                    {errors.name && <p className="mt-1.5 text-sm text-primary">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor={`edit-${account.id}-email`} className={LABEL}>
                      Email
                      <RequiredMark />
                    </label>
                    <input
                      id={`edit-${account.id}-email`}
                      aria-required="true"
                      type="email"
                      autoComplete="off"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        clearError("email");
                      }}
                      placeholder={isCustomer ? "Their email" : "Their work email"}
                      className={field("email")}
                    />
                    {errors.email && <p className="mt-1.5 text-sm text-primary">{errors.email}</p>}
                  </div>
                  {change.email && !errors.email && !isCustomer && (
                    <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900 sm:col-span-2">
                      They&apos;ll be signed out and sign in again with {change.email}. Any reset link sent to the old
                      address stops working.
                    </p>
                  )}
                  {isCustomer && (
                    <div className="sm:col-span-2">
                      <label htmlFor={`edit-${account.id}-mobile`} className={LABEL}>
                        Mobile number
                        <RequiredMark />
                      </label>
                      <div className="flex gap-2">
                        <SelectField
                          label="Country code"
                          hideLabel
                          value={countryCode}
                          onChange={(next) => {
                            setCountryCode(next);
                            setMobile((current) => nationalDigits(current, next));
                            clearError("phone");
                          }}
                          options={countryOptions(currentCode)}
                          compact
                          className="w-24 shrink-0"
                        />
                        <input
                          id={`edit-${account.id}-mobile`}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-required="true"
                          aria-invalid={Boolean(errors.phone)}
                          value={mobile}
                          onChange={(event) => {
                            setMobile(nationalDigits(event.target.value, countryCode));
                            clearError("phone");
                          }}
                          placeholder={countryCode === "+91" ? "10-digit number" : "Their mobile number"}
                          className={cn(field("phone"), "min-w-0")}
                        />
                      </div>
                      {errors.phone ? (
                        <p className="mt-1.5 text-sm text-primary">{errors.phone}</p>
                      ) : (
                        phoneChanged && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-800">
                            <LogOut aria-hidden="true" className="size-3.5 shrink-0" />
                            They will be signed out and must sign in with the new number.
                          </p>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {venue && (
                <div>
                  <SelectField
                    label="Venue they manage"
                    value={venueSlug}
                    onChange={(slug) => {
                      setVenueSlug(slug);
                      clearError("venueSlug");
                    }}
                    options={venue.options.map((option) => {
                      const isTaken = Boolean(option.hasAccount) && option.slug !== venue.slug;
                      return { value: option.slug, label: option.name, disabled: isTaken, note: isTaken ? "Has a login" : undefined };
                    })}
                    placeholder="Pick a venue"
                    required
                  />
                  {errors.venueSlug ? (
                    <p className="mt-1.5 text-sm text-primary">{errors.venueSlug}</p>
                  ) : (
                    venueSlug !== venue.slug && (
                      <p className="mt-1.5 text-xs text-tertiary/55">They are signed out and sign in again to the new venue.</p>
                    )
                  )}
                </div>
              )}

              {role && <RolePicker value={role} onChange={setRole} idPrefix={`edit-${account.id}-role`} />}

              {showsAccess && (
                <PermissionPicker
                  value={permissions}
                  onChange={(next) => {
                    setPermissions(next);
                    clearError("permissions");
                  }}
                  grantable={access.grantable}
                  error={errors.permissions}
                  idPrefix={`edit-${account.id}-access`}
                />
              )}

              {canEditDetails &&
                !isCustomer &&
                (isResetting ? (
                  <div className="rounded-xl border border-tertiary/10 bg-tertiary/3 p-4">
                    <TemporaryPasswordField
                      id={`edit-${account.id}-password`}
                      value={password}
                      onChange={(value) => {
                        setPassword(value);
                        clearError("temporaryPassword");
                      }}
                      error={errors.temporaryPassword}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetting(false);
                        setPassword("");
                        clearError("temporaryPassword");
                      }}
                      className="mt-3 text-sm font-medium text-tertiary/60 transition-opacity hover:opacity-75"
                    >
                      Keep their current password
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsResetting(true)}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-tertiary/20 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-tertiary/35 hover:shadow-sm"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-tertiary/70">
                      <KeyRound aria-hidden="true" className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-tertiary">Set a new temporary password</span>
                      <span className="block text-xs text-tertiary/55">
                        Signs them out. They choose their own the next time they sign in.
                      </span>
                    </span>
                  </button>
                ))}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-4 border-t border-tertiary/8 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-tertiary/60 transition-opacity hover:opacity-75"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !hasChanges}
                className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-medium text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditAccountModal;
