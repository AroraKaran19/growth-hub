"use client";

import { useState, type FormEvent } from "react";
import { Store } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import SelectField from "@/app/components/ui/form/SelectField";
import type { InvitePartnerInput, VenueOption } from "@/hooks/usePartnerAccounts";
import { readApiError } from "@/libs/api/errors";
import { toastFailed, toastInvited } from "@/libs/toast";
import { cn } from "@/utils";
import { passwordProblem } from "@/utils/password";
import TemporaryPasswordField from "../TemporaryPasswordField";

const INPUT =
  "w-full rounded-lg border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const LABEL = "mb-1.5 block text-sm font-medium text-tertiary";

type Errors = Partial<Record<"name" | "email" | "venueSlug" | "temporaryPassword", string>>;

type InvitePartnerCardProps = {
  venues: VenueOption[];
  onInvite: (input: InvitePartnerInput) => Promise<void>;
};

// Free venues first; each venue has only one partner login.
const venueOptions = (venues: VenueOption[]) =>
  [...venues.filter((venue) => !venue.hasAccount), ...venues.filter((venue) => venue.hasAccount)].map((venue) => ({
    value: venue.slug,
    label: venue.name,
    disabled: venue.hasAccount,
    note: venue.hasAccount ? "Has a login" : undefined,
  }));

const InvitePartnerCard = ({ venues, onInvite }: InvitePartnerCardProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [venueSlug, setVenueSlug] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Errors = {
      ...(name.trim().length < 2 && { name: "Enter a name." }),
      ...(!/^\S+@\S+\.\S+$/.test(email.trim()) && { email: "Enter a valid email address." }),
      ...(!venueSlug && { venueSlug: "Pick the venue they manage." }),
      ...(passwordProblem(temporaryPassword) && { temporaryPassword: passwordProblem(temporaryPassword)! }),
    };
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    try {
      await onInvite({ name: name.trim(), email: email.trim(), venueSlug, temporaryPassword });
      toastInvited({ email: email.trim().toLowerCase(), password: temporaryPassword, portal: "partner" });
      setName("");
      setEmail("");
      setVenueSlug("");
      setTemporaryPassword("");
    } catch (error) {
      const info = readApiError(error);
      if (info.code === "EMAIL_TAKEN") {
        setErrors({ email: "That email already has a Growth Hub account." });
      } else if (info.code === "VENUE_UNKNOWN") {
        setErrors({ venueSlug: "That venue no longer exists." });
      } else if (info.code === "VENUE_HAS_ACCOUNT") {
        setErrors({ venueSlug: info.message });
      } else if (Object.keys(info.fields).length > 0) {
        setErrors({
          name: info.fields.name,
          email: info.fields.email,
          venueSlug: info.fields.venueSlug,
          temporaryPassword: info.fields.temporaryPassword,
        });
      } else {
        toastFailed(info.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const field = (key: keyof Errors) =>
    cn(INPUT, errors[key] ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35");

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="h-fit rounded-2xl border border-tertiary/8 bg-secondary p-5 shadow-lg shadow-tertiary/5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="cta-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-secondary">
          <Store aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-tertiary">Invite a venue admin</h2>
          <p className="text-sm text-tertiary/55">They sign in to the venue portal with this email and a temporary password you set.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label htmlFor="partner-name" className={LABEL}>
            Name
            <RequiredMark />
          </label>
          <input
            id="partner-name"
            aria-required="true"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Their full name"
            className={field("name")}
          />
          {errors.name && <p className="mt-1.5 text-sm text-primary">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="partner-email" className={LABEL}>
            Email
            <RequiredMark />
          </label>
          <input
            id="partner-email"
            aria-required="true"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Their work email"
            className={field("email")}
          />
          {errors.email && <p className="mt-1.5 text-sm text-primary">{errors.email}</p>}
        </div>
        <div>
          <SelectField
            label="Venue"
            value={venueSlug}
            onChange={(slug) => {
              setVenueSlug(slug);
              setErrors((current) => ({ ...current, venueSlug: undefined }));
            }}
            options={venueOptions(venues)}
            placeholder="Pick a venue without a login"
            required
          />
          {errors.venueSlug && <p className="mt-1.5 text-sm text-primary">{errors.venueSlug}</p>}
        </div>
        <TemporaryPasswordField
          id="partner-temporary-password"
          value={temporaryPassword}
          onChange={setTemporaryPassword}
          error={errors.temporaryPassword}
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="cta-gradient mt-5 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Inviting..." : "Invite venue admin"}
      </button>
    </form>
  );
};

export default InvitePartnerCard;
