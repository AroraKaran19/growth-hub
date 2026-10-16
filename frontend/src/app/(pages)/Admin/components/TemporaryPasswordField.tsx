"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { cn } from "@/utils";
import { generatePassword } from "@/utils/password";

type TemporaryPasswordFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
};

const ICON_BUTTON =
  "flex size-9 shrink-0 items-center justify-center rounded-lg border border-tertiary/15 text-tertiary/70 transition-colors hover:border-tertiary/35 hover:text-tertiary disabled:opacity-40";

const TemporaryPasswordField = ({ id, value, onChange, error, required = false }: TemporaryPasswordFieldProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-tertiary">
        Temporary password
        {required && <RequiredMark />}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          value={value}
          aria-required={required || undefined}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            onChange(event.target.value);
            setIsCopied(false);
          }}
          placeholder="Type one or generate it"
          className={cn(
            "w-full rounded-lg border bg-secondary px-3.5 py-2.5 font-mono text-sm text-tertiary outline-none transition-colors placeholder:font-sans placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
            error ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35",
          )}
        />
        <button
          type="button"
          onClick={() => {
            onChange(generatePassword());
            setIsCopied(false);
          }}
          aria-label="Generate a password"
          title="Generate"
          className={ICON_BUTTON}
        >
          <Sparkles aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!value}
          aria-label={isCopied ? "Copied" : "Copy password"}
          title="Copy"
          className={cn(ICON_BUTTON, isCopied && "border-green-600/40 text-green-700")}
        >
          {isCopied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-primary">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-tertiary/55">
          Share it privately. They choose their own the first time they sign in.
        </p>
      )}
    </div>
  );
};

export default TemporaryPasswordField;
