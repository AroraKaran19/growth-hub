"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import type { SelectOption } from "@/types/search";
import { cn } from "@/utils";
import RequiredMark from "./RequiredMark";

export type SelectFieldOption = SelectOption & { disabled?: boolean; note?: string };

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  className?: string;
  /** Keeps the label for screen readers only, for compact toolbars. */
  hideLabel?: boolean;
  icon?: LucideIcon;
  /** Closed field shows the raw value, for narrow pickers like dialling codes. */
  compact?: boolean;
  required?: boolean;
};

const MENU_GAP = 8;
const MENU_MAX_HEIGHT = 224;
const MIN_ROOM_BELOW = 160;

/** Fixed under the field, or above it when the screen has more room there. */
export const placeMenu =(field: DOMRect, compact: boolean): CSSProperties => {
  const below = window.innerHeight - field.bottom - MENU_GAP * 2;
  const above = field.top - MENU_GAP * 2;
  const openUp = below < MIN_ROOM_BELOW && above > below;
  return {
    position: "fixed",
    left: field.left,
    ...(compact ? { minWidth: field.width } : { width: field.width }),
    maxHeight: Math.min(MENU_MAX_HEIGHT, openUp ? above : below),
    ...(openUp ? { bottom: window.innerHeight - field.top + MENU_GAP } : { top: field.bottom + MENU_GAP }),
  };
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
  compact = false,
  required = false,
}: SelectFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
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
    if (!option || option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  const nextEnabled = (from: number, step: 1 | -1) => {
    for (let index = from + step; index >= 0 && index < options.length; index += step) {
      if (!options[index].disabled) return index;
    }
    return from;
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !listRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  // The menu lives on <body>, so a modal or card that scrolls or clips can't cut it off.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const measure = () => {
      if (buttonRef.current) setMenuStyle(placeMenu(buttonRef.current.getBoundingClientRect(), compact));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [isOpen, compact]);

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
        setActiveIndex((index) => nextEnabled(index, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) return open();
        setActiveIndex((index) => (index < 0 ? nextEnabled(-1, 1) : nextEnabled(index, -1)));
        break;
      case "Home":
        if (!isOpen) return;
        event.preventDefault();
        setActiveIndex(nextEnabled(-1, 1));
        break;
      case "End":
        if (!isOpen) return;
        event.preventDefault();
        setActiveIndex(nextEnabled(options.length, -1));
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
        {required && <RequiredMark />}
      </span>

      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={labelId}
        aria-required={required || undefined}
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
          <span className="truncate">
            {(compact ? selected?.value : selected?.label) ?? placeholder}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-tertiary/50 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && menuStyle && createPortal(
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          style={menuStyle}
          // Keeps focus on the field, so typing and Escape still reach it.
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "z-100 overflow-y-auto rounded-xl border border-tertiary/10 bg-secondary p-1.5 shadow-xl shadow-tertiary/15",
            compact && "w-max",
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;

            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                onClick={() => select(index)}
                onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  option.disabled ? "cursor-not-allowed text-tertiary/40" : "cursor-pointer",
                  index === activeIndex && !option.disabled && "bg-primary/8",
                  !option.disabled && (isSelected ? "font-semibold text-primary" : "text-tertiary"),
                )}
              >
                <span className="truncate">{option.label}</span>
                {option.note && <span className="shrink-0 rounded-full bg-tertiary/6 px-2 py-0.5 text-xs font-medium text-tertiary/55">{option.note}</span>}
                {isSelected && !option.note && <Check aria-hidden="true" className="size-4 shrink-0" />}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
};

export default SelectField;
