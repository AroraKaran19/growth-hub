"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/utils";
import RequiredMark from "./RequiredMark";

type PasswordInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  invalid?: boolean;
  hint?: string;
  autoFocus?: boolean;
  required?: boolean;
};

const PasswordInput = ({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  invalid = false,
  hint,
  autoFocus,
  required = false,
}: PasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-tertiary">
        {label}
        {required && <RequiredMark />}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid}
          aria-required={required || undefined}
          autoFocus={autoFocus}
          className={cn(
            "w-full rounded-lg border bg-secondary py-2.5 pl-3.5 pr-11 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
            invalid ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35",
          )}
        />
        <button
          type="button"
          onClick={() => setIsVisible((shown) => !shown)}
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-tertiary/50 transition-colors hover:bg-tertiary/5 hover:text-tertiary"
        >
          {isVisible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-tertiary/55">{hint}</p>}
    </div>
  );
};

export default PasswordInput;
