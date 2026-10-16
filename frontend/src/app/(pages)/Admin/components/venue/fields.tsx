import type { ReactNode } from "react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { cn } from "@/utils";

export const INPUT =
  "w-full rounded-lg border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

export const LABEL = "mb-1.5 block text-sm font-medium text-tertiary";

export const RAISED = "rounded-2xl border border-tertiary/8 bg-secondary shadow-lg shadow-tertiary/5";

export const QUIET = "text-sm font-medium transition-opacity hover:opacity-75 disabled:opacity-50";

export const inputClass = (hasError: boolean, extra?: string) =>
  cn(INPUT, hasError ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35", extra);

type SectionProps = {
  title: string;
  hint?: string;
  action?: ReactNode;
  /** An anchor other pages can link to, e.g. a venue health warning. */
  id?: string;
  children: ReactNode;
};

export const Section = ({ title, hint, action, id, children }: SectionProps) => (
  <section id={id} className={cn(RAISED, "scroll-mt-24 p-5 sm:p-6")}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-tertiary">{title}</h2>
        {hint && <p className="mt-1 text-sm text-tertiary/60">{hint}</p>}
      </div>
      {action}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  /** Shows the mark only; the child control sets its own aria-required. */
  required?: boolean;
  children: ReactNode;
};

export const Field = ({ id, label, error, optional, required, children }: FieldProps) => (
  <div>
    <label htmlFor={id} className={LABEL}>
      {label}
      {required && <RequiredMark />}
      {optional &&<span className="ml-1.5 font-normal text-tertiary/45">(optional)</span>}
    </label>
    {children}
    {error && (
      <p id={`${id}-error`} className="mt-1.5 text-sm text-primary">
        {error}
      </p>
    )}
  </div>
);

type ChipProps = {
  label: string;
  isOn: boolean;
  onToggle: () => void;
};

export const Chip = ({ label, isOn, onToggle }: ChipProps) => (
  <button
    type="button"
    aria-pressed={isOn}
    onClick={onToggle}
    className={cn(
      "rounded-full border px-3.5 py-1.5 text-sm transition-all",
      isOn
        ? "border-primary/40 bg-primary/8 font-medium text-primary shadow-sm"
        : "border-tertiary/15 text-tertiary/75 hover:-translate-y-0.5 hover:border-tertiary/30",
    )}
  >
    {label}
  </button>
);
