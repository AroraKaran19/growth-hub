"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Globe, X } from "lucide-react";
import { SEO_PAGE_COPY } from "@/config/seoPages";
import { SEO_PAGES, type HomeContent } from "@/types/homeContent";
import Toggle from "../Toggle";
import ImageField from "./ImageField";
import { LabelledField, TextArea, TextInput } from "./inputs";
import type { Errors } from "./SectionEditor";

type FormProps<K extends "seo" | "seoPages"> = {
  draft: HomeContent[K];
  set: (next: HomeContent[K]) => void;
  errors: Errors;
};

const Group = ({ title, hint, children }: { title: string; hint: string; children: ReactNode }) => (
  <section className="rounded-xl border border-tertiary/10 bg-tertiary/2 p-4 sm:p-5">
    <h3 className="text-sm font-semibold text-tertiary">{title}</h3>
    <p className="mt-0.5 text-xs text-tertiary/55">{hint}</p>
    <div className="mt-4 flex flex-col gap-4">{children}</div>
  </section>
);

/** How the page could look in search results, so length problems are visible as you type. */
const SearchPreview = ({ title, url, description }: { title: string; url: string; description: string }) => (
  <div className="rounded-xl border border-tertiary/10 bg-secondary p-4 shadow-sm">
    <p className="text-xs text-tertiary/45">Search result preview</p>
    <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-tertiary/60">
      <Globe aria-hidden="true" className="size-3.5 shrink-0" />
      {url}
    </p>
    <p className="mt-1 line-clamp-1 text-lg text-blue-700">{title || "Your site title"}</p>
    <p className="mt-0.5 line-clamp-2 text-sm text-tertiary/65">{description || "Your site description."}</p>
  </div>
);

const MAX_KEYWORDS = 15;

const KeywordsField = ({ value, onChange, error }: { value: string[]; onChange: (next: string[]) => void; error?: string }) => {
  const [typed, setTyped] = useState("");
  const add = () => {
    const word = typed.trim().replace(/,$/, "").trim();
    if (word && !value.includes(word) && value.length < MAX_KEYWORDS) onChange([...value, word]);
    setTyped("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && !typed && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <LabelledField id="seo-keywords" label="Keywords" optional error={error}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-tertiary/20 bg-secondary px-2.5 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        {value.map((word) => (
          <span key={word} className="inline-flex items-center gap-1 rounded-full bg-tertiary/6 py-1 pl-2.5 pr-1 text-xs font-medium text-tertiary">
            {word}
            <button
              type="button"
              aria-label={`Remove ${word}`}
              onClick={() => onChange(value.filter((item) => item !== word))}
              className="rounded-full p-0.5 text-tertiary/50 hover:bg-tertiary/10 hover:text-tertiary"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </span>
        ))}
        <input
          id="seo-keywords"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          disabled={value.length >= MAX_KEYWORDS}
          placeholder={value.length ? "" : "coworking Bangalore, meeting rooms"}
          className="min-w-32 flex-1 bg-transparent px-1 py-0.5 text-sm text-tertiary outline-none placeholder:text-tertiary/40"
        />
      </div>
      <p className="mt-1.5 text-xs text-tertiary/55">Press Enter or a comma after each one. Up to {MAX_KEYWORDS}.</p>
    </LabelledField>
  );
};

export const SeoForm = ({ draft, set, errors }: FormProps<"seo">) => {
  const field = <K extends keyof HomeContent["seo"]>(key: K) => (next: HomeContent["seo"][K]) => set({ ...draft, [key]: next });

  return (
    <div className="flex flex-col gap-5">
      <Group title="Site identity" hint="The name and copy search engines and browsers show for the site.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput id="seo-siteName" label="Site name" value={draft.siteName} max={60} error={errors.siteName} onChange={field("siteName")} required />
          <TextInput
            id="seo-siteUrl"
            label="Site address"
            value={draft.siteUrl}
            max={120}
            placeholder="https://growthhub.in"
            error={errors.siteUrl}
            onChange={field("siteUrl")}
          />
        </div>
        <TextInput
          id="seo-defaultTitle"
          label="Home page title"
          value={draft.defaultTitle}
          max={70}
          error={errors.defaultTitle}
          onChange={field("defaultTitle")}
          required
        />
        <TextArea
          id="seo-description"
          label="Description"
          value={draft.description}
          max={160}
          rows={2}
          error={errors.description}
          onChange={field("description")}
          required
        />
        <KeywordsField value={draft.keywords} onChange={field("keywords")} error={errors.keywords} />
        <SearchPreview title={draft.defaultTitle} url={draft.siteUrl || "https://your-site"} description={draft.description} />
        <p className="text-xs text-tertiary/55">
          Other pages show as &ldquo;Page title | {draft.siteName || "Site name"}&rdquo;. Titles read best under 60 characters, descriptions under 160.
        </p>
      </Group>

      <Group title="Sharing" hint="The card shown when someone shares a link on WhatsApp, LinkedIn or X.">
        <ImageField
          id="seo-shareImage"
          label="Share image"
          optional
          aspect="aspect-[1200/630]"
          hint="1200 by 630 pixels works everywhere. Venue pages use their own cover instead."
          value={draft.shareImage}
          onChange={field("shareImage")}
        />
        <TextInput
          id="seo-twitterHandle"
          label="X (Twitter) handle"
          value={draft.twitterHandle}
          max={16}
          placeholder="@growthhub"
          error={errors.twitterHandle}
          onChange={field("twitterHandle")}
        />
      </Group>

      <Group title="Icons" hint="Leave them empty to keep the built-in Growth Hub icon. Browsers can take a day to show a new one.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ImageField
            id="seo-favicon"
            label="Favicon"
            optional
            compact
            aspect="aspect-square"
            hint="A square PNG, at least 48 by 48 pixels."
            value={draft.favicon}
            onChange={field("favicon")}
          />
          <ImageField
            id="seo-appleIcon"
            label="Home screen icon"
            optional
            compact
            aspect="aspect-square"
            hint="Used when the site is saved to a phone. A 180 by 180 PNG."
            value={draft.appleIcon}
            onChange={field("appleIcon")}
          />
        </div>
      </Group>

      <Group title="Search engines" hint="Verify the site with Google, or keep it out of search results while it isn't ready.">
        <TextInput
          id="seo-googleVerification"
          label="Google Search Console code"
          value={draft.googleVerification}
          max={100}
          placeholder="The content value from Google's meta tag"
          error={errors.googleVerification}
          onChange={field("googleVerification")}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary px-4 py-3 shadow-sm">
          <div>
            <p className="text-sm font-medium text-tertiary">Hide the site from search engines</p>
            <p className="text-xs text-tertiary/55">
              {draft.hideFromSearch
                ? "On: search engines are asked not to list any page, and the sitemap is empty."
                : "Off: public pages can appear in search results."}
            </p>
          </div>
          <Toggle checked={draft.hideFromSearch} onChange={field("hideFromSearch")} label="Hide from search engines" hideLabel />
        </div>
      </Group>
    </div>
  );
};

export const SeoPagesForm = ({ draft, set, errors }: FormProps<"seoPages">) => (
  <div className="flex flex-col gap-4">
    {SEO_PAGES.map((page) => {
      const copy = SEO_PAGE_COPY[page];
      const value = draft[page];
      const change = (next: Partial<typeof value>) => set({ ...draft, [page]: { ...value, ...next } });
      return (
        <section key={page} className="rounded-xl border border-tertiary/10 bg-secondary p-4 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-tertiary">{copy.label}</h3>
            <span className="font-mono text-xs text-tertiary/45">{copy.path}</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <TextInput
              id={`seoPages-${page}-title`}
              label="Title"
              value={value.title}
              max={70}
              placeholder={copy.title || "The home page title above"}
              error={errors[`${page}.title`]}
              onChange={(title) => change({ title })}
            />
            <TextArea
              id={`seoPages-${page}-description`}
              label="Description"
              value={value.description}
              max={160}
              rows={2}
              placeholder={copy.description || "The site description above"}
              error={errors[`${page}.description`]}
              onChange={(description) => change({ description })}
            />
          </div>
        </section>
      );
    })}
    <p className="text-xs text-tertiary/55">Leave a box empty to keep the wording shown in grey.</p>
  </div>
);
