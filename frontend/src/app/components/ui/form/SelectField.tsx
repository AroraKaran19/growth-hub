"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import type { SelectOption } from "@/types/search";
import { cn } from "@/utils";

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  /** Keeps the label for screen readers only, for compact toolbars. */
  hideLabel?: boolean;
  icon?: LucideIcon;
};

// Custom listbox: a native <select>'s popup can't be themed.
const SelectField = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Select",
  className,
  hideLabel = false,
  icon: Icon,
}: SelectFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const labelId = useId();
  const listboxId = useId();

  const selected = options.find((option) => option.value === value);
  const optionId = (index: number) => `${listboxId}-${index}`;

  const open = () => {
    setActiveIndex(options.findIndex((option) => option.value === value));
    setIsOpen(true);
  };

  const select = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const option = listRef.current?.children[activeIndex];
    option?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) return open();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) return open();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        if (!isOpen) return;
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        if (!isOpen) return;
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen) select(activeIndex);
        else open();
        break;
      case "Escape":
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <span
        id={labelId}
        className={cn(
          hideLabel
            ? "sr-only"
            : "mb-1.5 block text-sm font-medium text-tertiary",
        )}
      >
        {label}
      </span>

      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={labelId}
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-secondary py-2.5 pl-3.5 pr-3 text-left text-sm outline-none transition-colors",
          isOpen
            ? "border-primary ring-2 ring-primary/20"
            : "border-tertiary/15 hover:border-tertiary/30",
          selected ? "text-tertiary" : "text-tertiary/55",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon && (
            <Icon
              aria-hidden="true"
              className="size-4 shrink-0 text-tertiary/45"
            />
          )}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-tertiary/50 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-tertiary/10 bg-secondary p-1.5 shadow-xl shadow-tertiary/15"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;

            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                onClick={() => select(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  index === activeIndex && "bg-primary/8",
                  isSelected ? "font-semibold text-primary" : "text-tertiary",
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check aria-hidden="true" className="size-4 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SelectField;
