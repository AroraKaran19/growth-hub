"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

export const emptyCode = (length: number) => Array<string>(length).fill("");

type OtpInputProps = {
  length: number;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  label?: string;
};

const BOX =
  "size-12 rounded-lg border border-tertiary/20 bg-secondary text-center text-lg font-semibold text-tertiary outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:bg-tertiary/4 sm:size-14";

const OtpInput = ({
  length,
  value,
  onChange,
  disabled = false,
  invalid = false,
  autoFocus = false,
  label = "One-time code",
}: OtpInputProps) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const fillFrom = (index: number, digits: string) => {
    const updated = [...value];
    digits
      .slice(0, length - index)
      .split("")
      .forEach((digit, offset) => {
        updated[index + offset] = digit;
      });
    onChange(updated);
    refs.current[Math.min(index + digits.length, length - 1)]?.focus();
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      onChange(value.map((entry, i) => (i === index ? "" : entry)));
      return;
    }
    // An SMS autofill lands the whole code in one box.
    if (digits.length >= length - index && digits.length > 1) {
      fillFrom(index, digits);
      return;
    }
    fillFrom(index, digits.slice(-1));
  };

  const handleKey = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      event.preventDefault();
      onChange(value.map((entry, i) => (i === index - 1 ? "" : entry)));
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "");
    if (digits) fillFrom(index, digits);
  };

  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex justify-between gap-2">
        {value.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            autoFocus={autoFocus && index === 0}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={invalid}
            value={digit}
            disabled={disabled}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKey(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            onFocus={(event) => event.target.select()}
            className={BOX}
          />
        ))}
      </div>
    </fieldset>
  );
};

export default OtpInput;
