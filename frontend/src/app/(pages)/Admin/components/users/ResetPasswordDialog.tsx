"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { readApiError } from "@/libs/api/errors";
import { toastFailed, toastInvited } from "@/libs/toast";
import { passwordProblem } from "@/utils/password";
import TemporaryPasswordField from "../TemporaryPasswordField";

type ResetPasswordDialogProps = {
  name: string;
  email: string;
  portal: "admin" | "partner";
  onSave: (temporaryPassword: string) => Promise<unknown>;
  onClose: () => void;
};

const ResetPasswordDialog = ({ name, email, portal, onSave, onClose }: ResetPasswordDialogProps) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(password);
      toastInvited({ email, password, portal });
      onClose();
    } catch (caught) {
      const info = readApiError(caught);
      if (info.fields.temporaryPassword) setError(info.fields.temporaryPassword);
      else toastFailed(info.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tertiary/50 p-4 sm:items-center" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-title"
        onSubmit={submit}
        noValidate
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-secondary shadow-2xl"
      >
        <div className="relative flex items-center gap-3.5 overflow-hidden bg-tertiary px-6 py-5 text-secondary">
          <div aria-hidden="true" className="absolute -right-12 -top-16 size-40 rounded-full bg-primary/40 blur-3xl" />
          <span className="cta-gradient relative flex size-11 shrink-0 items-center justify-center rounded-full">
            <KeyRound aria-hidden="true" className="size-5" />
          </span>
          <div className="relative min-w-0">
            <h2 id="reset-password-title" className="text-lg font-bold">
              Reset {name}&apos;s password
            </h2>
            <p className="truncate text-sm text-secondary/65">{email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-6">
          <TemporaryPasswordField
            id="reset-temporary-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setError(undefined);
            }}
            error={error}
          />
          <p className="text-sm text-tertiary/60">They&apos;re signed out now and choose their own password the next time they sign in.</p>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-tertiary/8 px-6 py-4">
          <button type="button" onClick={onClose} className="text-sm font-medium text-tertiary/60 transition-opacity hover:opacity-75">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-medium text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Set password"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordDialog;
