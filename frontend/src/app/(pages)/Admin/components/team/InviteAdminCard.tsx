"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck, UserPlus } from "lucide-react";
import type { InviteAdminInput } from "@/hooks/useTeam";
import { readApiError } from "@/libs/api/errors";
import { cn } from "@/utils";
import { passwordProblem } from "@/utils/password";
import TemporaryPasswordField from "../TemporaryPasswordField";
import PermissionPicker from "./PermissionPicker";

const INPUT =
  "w-full rounded-lg border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const LABEL = "mb-1.5 block text-sm font-medium text-tertiary";

type Errors = Partial<Record<"name" | "email" | "permissions" | "temporaryPassword", string>>;

type InviteAdminCardProps = {
  onInvite: (input: InviteAdminInput) => Promise<void>;
};

const InviteAdminCard = ({ onInvite }: InviteAdminCardProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ email: string; password: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const validate = (): Errors => ({
    ...(name.trim().length < 2 && { name: "Enter a name." }),
    ...(!/^\S+@\S+\.\S+$/.test(email.trim()) && { email: "Enter a valid email address." }),
    ...(permissions.length === 0 && { permissions: "Pick at least one section." }),
    ...(passwordProblem(temporaryPassword) && { temporaryPassword: passwordProblem(temporaryPassword)! }),
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    setInvited(null);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    try {
      await onInvite({ name: name.trim(), email: email.trim(), permissions, temporaryPassword });
      setInvited({ email: email.trim().toLowerCase(), password: temporaryPassword });
      setName("");
      setEmail("");
      setPermissions([]);
      setTemporaryPassword("");
    } catch (error) {
      const info = readApiError(error);
      if (info.code === "EMAIL_TAKEN") {
        setErrors({ email: "That email already has a Growth Hub account." });
      } else if (Object.keys(info.fields).length > 0) {
        setErrors({
          name: info.fields.name,
          email: info.fields.email,
          permissions: info.fields.permissions,
          temporaryPassword: info.fields.temporaryPassword,
        });
      } else {
        setFormError(info.message);
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
          <UserPlus aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-tertiary">Invite an admin</h2>
          <p className="text-sm text-tertiary/55">They sign in with this email and a temporary password you set.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label htmlFor="invite-name" className={LABEL}>
            Name
          </label>
          <input
            id="invite-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Their full name"
            className={field("name")}
          />
          {errors.name && <p className="mt-1.5 text-sm text-primary">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="invite-email" className={LABEL}>
            Work email
          </label>
          <input
            id="invite-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Their work email"
            className={field("email")}
          />
          {errors.email && <p className="mt-1.5 text-sm text-primary">{errors.email}</p>}
        </div>

        <PermissionPicker
          value={permissions}
          onChange={setPermissions}
          error={errors.permissions}
          idPrefix="invite-permissions"
        />

        <TemporaryPasswordField
          id="invite-temporary-password"
          value={temporaryPassword}
          onChange={setTemporaryPassword}
          error={errors.temporaryPassword}
        />
      </div>

      {invited && (
        <p role="status" className="mt-4 flex items-start gap-2 text-sm text-green-700">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {invited.email} can sign in at /admin/login with{" "}
            <span className="font-mono font-semibold">{invited.password}</span>, then choose their own password.
          </span>
        </p>
      )}
      {formError && (
        <p role="alert" className="mt-4 text-sm text-primary">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="cta-gradient mt-5 w-full rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Inviting..." : "Invite admin"}
      </button>
    </form>
  );
};

export default InviteAdminCard;
