"use client";

import { FEATURE_ICON_NAMES, FeatureIcon } from "@/config/featureIcons";
import { cn } from "@/utils";

/** Icons come from a fixed set, so every card keeps the same line style. */
const IconPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (name: string) => void }) => (
  <fieldset>
    <legend className="mb-1.5 text-sm font-medium text-tertiary">{label}</legend>
    <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
      {FEATURE_ICON_NAMES.map((name) => {
        const isOn = name === value;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={isOn}
            aria-label={name}
            title={name}
            onClick={() => onChange(name)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg border transition-all",
              isOn
                ? "cta-gradient border-transparent text-secondary shadow-md"
                : "border-tertiary/12 text-tertiary/65 hover:-translate-y-0.5 hover:border-tertiary/30 hover:text-tertiary",
            )}
          >
            <FeatureIcon name={name} className="size-4" />
          </button>
        );
      })}
    </div>
  </fieldset>
);

export default IconPicker;
