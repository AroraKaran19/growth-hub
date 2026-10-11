"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { HOME_DEFAULTS } from "@/config/homeDefaults";
import { readApiError } from "@/libs/api/errors";
import { resetHomeSection, saveHomeSection } from "@/libs/api/siteAdmin";
import { toastDone, toastFailed } from "@/libs/toast";
import type { HomeContent, HomeOverrides, HomeSectionKey } from "@/types/homeContent";
import { cn } from "@/utils";
import { QUIET, RAISED } from "../venue/fields";

export type Errors = Record<string, string>;

type SectionEditorProps<K extends HomeSectionKey> = {
  section: K;
  title: string;
  hint: string;
  overrides: HomeOverrides;
  onSaved: (next: HomeOverrides) => void;
  onDirtyChange: (section: HomeSectionKey, isDirty: boolean) => void;
  children: (draft: HomeContent[K], set: (next: HomeContent[K]) => void, errors: Errors) => ReactNode;
};

/** One landing page section: edits stay local until Save; Reset returns to the built-in copy. */
const SectionEditor = <K extends HomeSectionKey>({ section, title, hint, overrides, onSaved, onDirtyChange, children }: SectionEditorProps<K>) => {
  const saved = (overrides[section] ?? HOME_DEFAULTS[section]) as HomeContent[K];
  const isCustom = section in overrides;
  const [draft, setDraft] = useState<HomeContent[K]>(saved);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => onDirtyChange(section, isDirty), [section, isDirty, onDirtyChange]);

  const save = async () => {
    setBusy("save");
    setErrors({});
    try {
      onSaved(await saveHomeSection(section, draft as NonNullable<HomeOverrides[K]>));
      toastDone(`${title} saved. The site shows it straight away.`);
    } catch (caught) {
      const info = readApiError(caught);
      if (Object.keys(info.fields).length) {
        setErrors(info.fields);
        toastFailed("Check the highlighted fields.");
      } else toastFailed(info.message);
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    setBusy("reset");
    try {
      const next = await resetHomeSection(section);
      onSaved(next);
      setDraft(HOME_DEFAULTS[section]);
      setErrors({});
      toastDone(`${title} is back to the built-in copy.`);
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={cn(RAISED, "overflow-hidden")}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-tertiary/8 bg-tertiary/2 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-tertiary">{title}</h2>
          <p className="mt-1 text-sm text-tertiary/60">{hint}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {/* An edit clears old messages; the next save checks the fields again. */}
        {children(draft, (next) => { setDraft(next); setErrors({}); }, errors)}
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-tertiary/8 bg-secondary/95 px-5 py-3.5 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          {isCustom && (
            <button type="button" disabled={busy !== null} onClick={() => void reset()} className={cn(QUIET, "inline-flex items-center gap-1.5 text-tertiary/60")}>
              <RotateCcw aria-hidden="true" className="size-3.5" />
              {busy === "reset" ? "Resetting..." : "Reset to built-in copy"}
            </button>
          )}
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              You have unsaved changes.
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isDirty && (
            <button type="button" disabled={busy !== null} onClick={() => { setDraft(saved); setErrors({}); }} className={cn(QUIET, "text-tertiary/60")}>
              Discard changes
            </button>
          )}
          <button
            type="button"
            disabled={!isDirty || busy !== null}
            onClick={() => void save()}
            className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-medium text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "save" ? "Saving..." : "Save section"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default SectionEditor;
