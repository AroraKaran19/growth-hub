"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { LoaderCircle, Search, UserRound } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { placeMenu } from "@/app/components/ui/form/SelectField";
import { searchCouponCustomers } from "@/libs/api/coupons";
import type { CouponCustomer } from "@/types/coupon";
import { cn } from "@/utils";
import { QUIET } from "../venue/fields";

export type PickedCustomer = Pick<CouponCustomer, "id" | "name" | "phone"> & { email: string | null };

type CustomerPickerProps = {
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer | null) => void;
  error?: string;
};

const MIN_QUERY = 2;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const fetchCustomers = ([, q]: [string, string]) => searchCouponCustomers(q);

/** Search-and-pick for the one customer a coupon belongs to. */
const CustomerPicker = ({ value, onChange, error }: CustomerPickerProps) => {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputId = useId();
  const labelId = useId();
  const listboxId = useId();
  const hintId = useId();

  const typed = search.trim();
  const { data, error: loadError, isValidating } = useSWR(
    q.length >= MIN_QUERY ? ["admin/coupons/customers", q] : null,
    fetchCustomers,
    { revalidateOnFocus: false, keepPreviousData: true },
  );
  const results = data ?? [];
  const isSearching = typed !== q || isValidating;
  const showList = isOpen && !value && typed.length >= MIN_QUERY;

  useEffect(() => {
    const timer = setTimeout(() => setQ(typed), 300);
    return () => clearTimeout(timer);
  }, [typed]);

  useEffect(() => {
    if (!showList) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !listRef.current?.contains(target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [showList]);

  // Portalled to <body>, so the modal's scrolling body can't clip it.
  useLayoutEffect(() => {
    if (!showList) return;
    const measure = () => {
      if (inputRef.current) setMenuStyle(placeMenu(inputRef.current.getBoundingClientRect(), false));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [showList]);

  useEffect(() => {
    if (!showList) return;
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [showList, activeIndex]);

  const pick = (customer: CouponCustomer | undefined) => {
    if (!customer) return;
    onChange(customer);
    setIsOpen(false);
    setSearch("");
  };

  const change = () => {
    onChange(null);
    setSearch("");
    setIsOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.max(0, Math.min(index + 1, results.length - 1)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      // Never submits the coupon form from the search box.
      event.preventDefault();
      if (showList && !isSearching) pick(results[activeIndex]);
    } else if (event.key === "Escape" || event.key === "Tab") {
      setIsOpen(false);
    }
  };

  const describedBy = error ? `${hintId} ${hintId}-error` : hintId;

  return (
    <div ref={containerRef}>
      <label htmlFor={value ? undefined : inputId} id={labelId} className="mb-1.5 block text-sm font-medium text-tertiary">
        Customer
        <RequiredMark />
      </label>

      {value ? (
        <div
          role="group"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-surface p-3 shadow-sm",
            error ? "border-primary" : "border-tertiary/10",
          )}
        >
          <span
            aria-hidden="true"
            className="cta-gradient flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-secondary shadow-md shadow-primary/20"
          >
            {initials(value.name) || <UserRound className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-tertiary">{value.name}</p>
            <p className="truncate text-xs text-tertiary/60">
              {value.phone}
              {value.email && <span className="text-tertiary/45">, {value.email}</span>}
            </p>
          </div>
          <button type="button" onClick={change} className={cn(QUIET, "shrink-0 text-primary")}>
            Change
            <span className="sr-only"> customer</span>
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-tertiary/40" />
          <input
            ref={inputRef}
            id={inputId}
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-expanded={showList}
            aria-controls={listboxId}
            aria-describedby={describedBy}
            aria-activedescendant={showList && results.length > 0 ? `${listboxId}-${activeIndex}` : undefined}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveIndex(0);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search name, email or phone"
            className={cn(
              "w-full rounded-lg border bg-secondary py-2.5 pl-10 pr-10 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
              error ? "border-primary" : "border-tertiary/20 hover:border-tertiary/35",
            )}
          />
          {showList && isSearching && (
            <LoaderCircle aria-hidden="true" className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-tertiary/40" />
          )}
        </div>
      )}

      <p id={hintId} className="mt-1.5 text-xs text-tertiary/55">
        Only this customer sees it in their wallet and can use it.
      </p>
      {error && (
        <p id={`${hintId}-error`} className="mt-1 text-sm text-primary">
          {error}
        </p>
      )}

      {showList &&
        menuStyle &&
        createPortal(
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Matching customers"
            style={menuStyle}
            // Keeps focus in the search box while a row is clicked.
            onMouseDown={(event) => event.preventDefault()}
            className="z-100 overflow-y-auto rounded-xl border border-tertiary/10 bg-secondary p-1.5 shadow-xl shadow-tertiary/15"
          >
            {results.map((customer, index) => (
              <li
                key={customer.id}
                id={`${listboxId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={index === activeIndex}
                onClick={() => pick(customer)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                  index === activeIndex && "bg-primary/8",
                  isSearching && "opacity-60",
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tertiary text-xs font-semibold text-secondary"
                >
                  {initials(customer.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-tertiary">{customer.name}</span>
                  <span className="block truncate text-xs text-tertiary/55">
                    {customer.phone}
                    {customer.email && `, ${customer.email}`}
                  </span>
                </span>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-3 text-center text-sm text-tertiary/55" aria-live="polite">
                {loadError && !isSearching
                  ? "Couldn't search customers. Try again."
                  : isSearching
                    ? "Searching customers..."
                    : `No active customers match "${q}".`}
              </li>
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
};

export default CustomerPicker;
