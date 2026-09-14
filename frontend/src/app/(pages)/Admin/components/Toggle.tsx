import { cn } from "@/utils";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Hides the text label visually; it stays the accessible name. */
  hideLabel?: boolean;
};

/** An on and off switch with the switch role, for listing status and flags. */
const Toggle = ({ checked, onChange, label, hideLabel = false }: ToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="inline-flex items-center gap-2.5 text-sm text-tertiary"
  >
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-green-600" : "bg-tertiary/20",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-secondary shadow transition-transform",
          checked ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </span>
    <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
  </button>
);

export default Toggle;
