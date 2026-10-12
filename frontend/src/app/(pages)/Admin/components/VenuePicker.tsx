"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { Building2, Check, ChevronDown, LoaderCircle, Search } from "lucide-react";
import { adminApi } from "@/libs/api/client";
import { cn } from "@/utils";

export type VenueOptionRow = { slug: string; name: string; locality: string; city: string; published: boolean };

type Page = { venues: VenueOptionRow[]; hasMore: boolean };

type VenuePickerProps = {
  label: string;
  value: string;
  onChange: (slug: string, venue: VenueOptionRow | null) => void;
  /** Adds a pinned "All venues" style option whose value is "". */
  allLabel?: string;
  placeholder?: string;
  hideLabel?: boolean;
  className?: string;
  error?: string;
};

const fetchPage = async ([, q, page]: [string, string, number]) =>
  (await adminApi.get<{ data: Page }>("/admin/options/venues", { params: { q: q || undefined, page } })).data.data;

const fetchOne = async ([, slug]: [string, string]) =>
  (await adminApi.get<{ data: { venue: VenueOptionRow } }>(`/admin/options/venues/${slug}`)).data.data.venue;

/** Searchable venue dropdown that loads 20 venues at a time as the list scrolls. */
const VenuePicker = ({ label, value, onChange, allLabel, placeholder = "Pick a venue", hideLabel, className, error }: VenuePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const labelId = useId();
  const listboxId = useId();

  const keyFor = (index: number, previous: Page | null): [string, string, number] | null =>
    !isOpen || (previous && !previous.hasMore) ? null : ["admin/options/venues", q, index + 1];
  const { data, size, setSize, isValidating, error: loadError } = useSWRInfinite(keyFor, fetchPage, { revalidateFirstPage: false });
  const venues = data?.flatMap((page) => page.venues) ?? [];
  const hasMore = data?.[data.length - 1]?.hasMore ?? false;
  const isLoadingMore = isOpen && isValidating && (!data || data.length < size);

  const listed = venues.find((venue) => venue.slug === value);
  const { data: picked } = useSWR(value && !listed ? ["admin/options/venue", value] : null, fetchOne, { revalidateOnFocus: false });
  const selected = listed ?? picked ?? null;

  const options: { slug: string; venue: VenueOptionRow | null }[] = [
    ...(allLabel && !q ? [{ slug: "", venue: null }] : []),
    ...venues.map((venue) => ({ slug: venue.slug, venue })),
  ];

  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [isOpen]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!isOpen || !sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isValidating) void setSize((current) => current + 1);
      },
      { root: listRef.current, rootMargin: "80px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isOpen, hasMore, isValidating, setSize, venues.length]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex]);

  const open = () => {
    setSearch("");
    setQ("");
    setActiveIndex(0);
    setIsOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.slug, option.venue);
    setIsOpen(false);
  };

  const onListKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Escape" || event.key === "Tab") {
      setIsOpen(false);
    }
  };

  const shown = value === "" && allLabel ? allLabel : (selected?.name ?? (value ? "Loading..." : placeholder));

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <span id={labelId} className={hideLabel ? "sr-only" : "mb-1.5 block text-sm font-medium text-tertiary"}>
        {label}
      </span>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={labelId}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={(event) => {
          if (!isOpen && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            open();
          }
        }}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-secondary py-2.5 pl-3.5 pr-3 text-left text-sm outline-none transition-colors",
          isOpen ? "border-primary ring-2 ring-primary/20" : error ? "border-primary" : "border-tertiary/15 hover:border-tertiary/30",
          value || allLabel ? "text-tertiary" : "text-tertiary/55",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Building2 aria-hidden="true" className="size-4 shrink-0 text-tertiary/45" />
          <span className="truncate">{shown}</span>
        </span>
        <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-tertiary/50 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 min-w-64 overflow-hidden rounded-xl border border-tertiary/10 bg-secondary shadow-xl shadow-tertiary/15">
          <label className="relative block border-b border-tertiary/8 p-1.5">
            <span className="sr-only">Search venues</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-tertiary/40" />
            <input
              autoFocus
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onListKey}
              placeholder="Search name or area"
              aria-controls={listboxId}
              className="w-full rounded-lg bg-tertiary/4 py-2 pl-8 pr-3 text-sm text-tertiary outline-none placeholder:text-tertiary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </label>

          <ul ref={listRef} id={listboxId} role="listbox" aria-labelledby={labelId} className="max-h-64 overflow-y-auto p-1.5">
            {options.map((option, index) => {
              const isSelected = option.slug === value;
              return (
                <li
                  key={option.slug || "all"}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => choose(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    index === activeIndex && "bg-primary/8",
                    isSelected ? "font-semibold text-primary" : "text-tertiary",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.venue?.name ?? allLabel}</span>
                    {option.venue && (
                      <span className="block truncate text-xs font-normal text-tertiary/50">
                        {option.venue.locality}, {option.venue.city}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {option.venue && !option.venue.published && (
                      <span className="rounded-full bg-tertiary/8 px-2 py-0.5 text-[11px] font-medium text-tertiary/60">Hidden</span>
                    )}
                    {isSelected && <Check aria-hidden="true" className="size-4" />}
                  </span>
                </li>
              );
            })}

            {loadError ? (
              <li className="px-3 py-3 text-center text-sm text-primary">Couldn&apos;t load venues. Close and try again.</li>
            ) : isLoadingMore ? (
              <li className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-tertiary/55">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Loading venues
              </li>
            ) : venues.length === 0 && data ? (
              <li className="px-3 py-3 text-center text-sm text-tertiary/55">{q ? `No venues match "${q}".` : "No venues yet."}</li>
            ) : null}
            {hasMore && <li ref={sentinelRef} aria-hidden="true" className="h-1" />}
          </ul>
        </div>
      )}

      {error && <p className="mt-1.5 text-sm text-primary">{error}</p>}
    </div>
  );
};

export default VenuePicker;
