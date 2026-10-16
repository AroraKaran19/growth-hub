import type { ReactNode } from "react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { LABEL, inputClass } from "../venue/fields";

type LabelledFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: ReactNode;
};

export const LabelledField = ({ id, label, required, optional, error, children }: LabelledFieldProps) => (
  <div>
    <label htmlFor={id} className={LABEL}>
      {label}
      {required && <RequiredMark />}
      {optional && <span className="ml-1.5 font-normal text-tertiary/45">(optional)</span>}
    </label>
    {children}
    {error && (
      <p id={`${id}-error`} className="mt-1.5 text-sm text-primary">
        {error}
      </p>
    )}
  </div>
);

type TextProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  error?: string;
  placeholder?: string;
  required?: boolean;
};

export const TextInput = ({ id, label, value, onChange, max, error, placeholder, required }: TextProps) => (
  <LabelledField id={id} label={label} required={required} error={error}>
    <input
      id={id}
      value={value}
      maxLength={max}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      aria-required={required || undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={inputClass(Boolean(error))}
    />
  </LabelledField>
);

export const TextArea = ({ id, label, value, onChange, max, error, placeholder, required, rows = 3 }: TextProps & { rows?: number }) => (
  <LabelledField id={id} label={label} required={required} error={error}>
    <textarea
      id={id}
      value={value}
      rows={rows}
      maxLength={max}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      aria-required={required || undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={inputClass(Boolean(error), "resize-y leading-relaxed")}
    />
    <p className="mt-1 text-right text-xs text-tertiary/40">
      {value.length}/{max}
    </p>
  </LabelledField>
);
