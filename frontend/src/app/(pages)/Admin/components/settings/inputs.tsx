import { Field, inputClass } from "../venue/fields";

type TextProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  error?: string;
  placeholder?: string;
};

export const TextInput = ({ id, label, value, onChange, max, error, placeholder }: TextProps) => (
  <Field id={id} label={label} error={error}>
    <input
      id={id}
      value={value}
      maxLength={max}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={inputClass(Boolean(error))}
    />
  </Field>
);

export const TextArea = ({ id, label, value, onChange, max, error, placeholder, rows = 3 }: TextProps & { rows?: number }) => (
  <Field id={id} label={label} error={error}>
    <textarea
      id={id}
      value={value}
      rows={rows}
      maxLength={max}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={inputClass(Boolean(error), "resize-y leading-relaxed")}
    />
    <p className="mt-1 text-right text-xs text-tertiary/40">
      {value.length}/{max}
    </p>
  </Field>
);
