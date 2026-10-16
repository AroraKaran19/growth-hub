"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { ArrowRight, CircleCheck, ImagePlus, LoaderCircle, X } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import SelectField from "@/app/components/ui/form/SelectField";
import { useSupportOptions } from "@/hooks/useSupport";
import { readApiError } from "@/libs/api/errors";
import { raiseSupportRequest } from "@/libs/api/support";
import { IMAGE_TYPES, UploadError, uploadSupportScreenshot } from "@/libs/api/uploads";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_LIMITS,
  type NewSupportRequest,
  type SupportCategory,
} from "@/types/support";
import { cn } from "@/utils";

type Field = "category" | "subject" | "message" | "attachments" | "relatedRef";
type Errors = Partial<Record<Field, string>>;
type Shot = { key: string; url: string };

const CATEGORY_OPTIONS = SUPPORT_CATEGORIES.map((value) => ({ value, label: SUPPORT_CATEGORY_LABELS[value] }));

const INPUT =
  "w-full rounded-xl border bg-secondary px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const LABEL = "mb-1.5 flex items-center text-sm font-medium text-tertiary";

const validate = (values: NewSupportRequest): Errors => {
  const errors: Errors = {};
  if (!values.category) errors.category = "Choose what this is about.";
  if (!values.subject.trim()) errors.subject = "Add a subject.";
  else if (values.subject.trim().length > SUPPORT_LIMITS.subject) errors.subject = `Keep the subject under ${SUPPORT_LIMITS.subject} characters.`;
  const message = values.message.trim().length;
  if (message < SUPPORT_LIMITS.messageMin) errors.message = `Tell us a little more (at least ${SUPPORT_LIMITS.messageMin} characters).`;
  else if (message > SUPPORT_LIMITS.messageMax) errors.message = "Keep the message under 2,000 characters.";
  return errors;
};

const EMPTY: NewSupportRequest = { category: "", relatedRef: "", subject: "", message: "", attachments: [] };

const SupportRequestForm = () => {
  const { mutate } = useSWRConfig();
  const { options: related, isLoading: isLoadingRelated } = useSupportOptions(true);
  const [values, setValues] = useState<NewSupportRequest>(EMPTY);
  const [shots, setShots] = useState<Shot[]>([]);
  const [uploading, setUploading] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [raised, setRaised] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof NewSupportRequest>(key: K, value: NewSupportRequest[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key as Field]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const relatedOptions = [
    { value: "", label: "Not about one booking or membership" },
    ...related.map((option) => ({ value: option.ref, label: option.label, note: option.ref })),
  ];

  const addShots = async (event: ChangeEvent<HTMLInputElement>) => {
    const room = SUPPORT_LIMITS.attachments - shots.length - uploading;
    const files = [...(event.target.files ?? [])].slice(0, Math.max(0, room));
    event.target.value = "";
    if (!files.length) return;
    setErrors((current) => ({ ...current, attachments: undefined }));
    setUploading((count) => count + files.length);
    await Promise.all(
      files.map(async (file) => {
        try {
          const shot = await uploadSupportScreenshot(file);
          setShots((current) => [...current, shot].slice(0, SUPPORT_LIMITS.attachments));
        } catch (caught) {
          const message = caught instanceof UploadError ? caught.message : readApiError(caught).message;
          setErrors((current) => ({ ...current, attachments: message }));
        } finally {
          setUploading((count) => count - 1);
        }
      }),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      document.getElementById(`support-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setIsSending(true);
    try {
      const request = await raiseSupportRequest({ ...values, attachments: shots.map((shot) => shot.key) });
      await mutate((key) => Array.isArray(key) && key[0] === "support");
      setRaised(request.ref);
    } catch (caught) {
      const problem = readApiError(caught);
      setErrors(problem.fields as Errors);
      setFormError(Object.keys(problem.fields).length ? null : problem.message);
    } finally {
      setIsSending(false);
    }
  };

  if (raised) {
    return (
      <div role="status" className="flex flex-col items-start rounded-3xl bg-secondary p-6 shadow-xl shadow-tertiary/8 ring-1 ring-tertiary/5 sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-green-500/12 text-green-700">
          <CircleCheck aria-hidden="true" className="size-6" />
        </span>
        <h3 className="mt-5 text-xl font-bold text-tertiary">Request raised</h3>
        <p className="mt-2 max-w-md text-sm text-tertiary/65">
          Your reference is <span className="font-mono font-medium text-tertiary">{raised}</span>. We reply within one working
          day, by email and on the request page.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-5">
          <Link
            href={`/account/support/${raised}`}
            className="cta-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/20 transition-opacity hover:opacity-90"
          >
            Track this request
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setRaised(null);
              setValues(EMPTY);
              setShots([]);
            }}
            className="text-sm font-medium text-primary transition-opacity hover:opacity-75"
          >
            Raise another
          </button>
        </div>
      </div>
    );
  }

  const fieldClass = (key: Field) => cn(INPUT, errors[key] ? "border-primary" : "border-tertiary/15 hover:border-tertiary/30");
  const errorText = (key: Field) =>
    errors[key] && (
      <p id={`support-${key}-error`} className="mt-1.5 text-sm text-primary">
        {errors[key]}
      </p>
    );
  const subjectLength = values.subject.trim().length;
  const messageLength = values.message.trim().length;
  const canAddShot = shots.length + uploading < SUPPORT_LIMITS.attachments;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-3xl bg-secondary p-5 shadow-xl shadow-tertiary/8 ring-1 ring-tertiary/5 sm:p-7"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div id="support-category" tabIndex={-1} className="outline-none">
          <SelectField
            label="What is it about?"
            value={values.category}
            onChange={(value) => set("category", value as SupportCategory)}
            options={CATEGORY_OPTIONS}
            placeholder="Choose a topic"
            required
          />
          {errorText("category")}
        </div>
        <div id="support-relatedRef" tabIndex={-1} className="outline-none">
          <SelectField
            label="Related to"
            value={values.relatedRef}
            onChange={(value) => set("relatedRef", value)}
            options={relatedOptions}
            placeholder={isLoadingRelated ? "Loading your bookings..." : "Optional"}
          />
          {errorText("relatedRef")}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="support-subject" className={LABEL}>
            Subject
            <RequiredMark />
            <span className={cn("ml-auto text-xs font-normal", subjectLength > SUPPORT_LIMITS.subject ? "text-primary" : "text-tertiary/40")}>
              {subjectLength}/{SUPPORT_LIMITS.subject}
            </span>
          </label>
          <input
            id="support-subject"
            value={values.subject}
            onChange={(event) => set("subject", event.target.value)}
            placeholder="A short summary, like the door code didn't work"
            aria-required="true"
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? "support-subject-error" : undefined}
            className={fieldClass("subject")}
          />
          {errorText("subject")}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="support-message" className={LABEL}>
            What happened?
            <RequiredMark />
            <span className={cn("ml-auto text-xs font-normal", messageLength > SUPPORT_LIMITS.messageMax ? "text-primary" : "text-tertiary/40")}>
              {messageLength < SUPPORT_LIMITS.messageMin ? `${SUPPORT_LIMITS.messageMin - messageLength} more to go` : `${messageLength}/${SUPPORT_LIMITS.messageMax}`}
            </span>
          </label>
          <textarea
            id="support-message"
            rows={5}
            value={values.message}
            onChange={(event) => set("message", event.target.value)}
            placeholder="When it happened, where, and what you expected instead."
            aria-required="true"
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "support-message-error" : undefined}
            className={cn(fieldClass("message"), "resize-y")}
          />
          {errorText("message")}
        </div>

        <div className="sm:col-span-2" id="support-attachments" tabIndex={-1}>
          <p className={LABEL}>
            Screenshots
            <span className="ml-1.5 font-normal text-tertiary/45">(optional, up to {SUPPORT_LIMITS.attachments}, {SUPPORT_LIMITS.attachmentMb} MB each)</span>
          </p>
          <ul className="flex flex-wrap gap-3">
            {shots.map((shot, index) => (
              <li key={shot.key} className="relative size-20 animate-[fade-up_0.3s_ease-out_both] motion-reduce:animate-none">
                <span className="relative block size-full overflow-hidden rounded-xl ring-1 ring-tertiary/10">
                  <Image src={shot.url} alt={`Screenshot ${index + 1}`} fill sizes="80px" className="object-cover" />
                </span>
                <button
                  type="button"
                  onClick={() => setShots((current) => current.filter((item) => item.key !== shot.key))}
                  aria-label={`Remove screenshot ${index + 1}`}
                  className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-tertiary text-secondary shadow-md transition-transform hover:scale-105"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
            {Array.from({ length: uploading }, (_, index) => (
              <li key={`uploading-${index}`} className="grid size-20 place-items-center rounded-xl bg-surface ring-1 ring-tertiary/10">
                <LoaderCircle aria-label="Uploading" className="size-5 animate-spin text-tertiary/50" />
              </li>
            ))}
            {canAddShot && (
              <li>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-tertiary/25 bg-surface text-xs font-medium text-tertiary/60 transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <ImagePlus aria-hidden="true" className="size-5" />
                  Add
                </button>
              </li>
            )}
          </ul>
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(",")} multiple className="sr-only" tabIndex={-1} onChange={(event) => void addShots(event)} aria-label="Choose screenshots" />
          {errorText("attachments")}
        </div>
      </div>

      {formError && (
        <p role="alert" className="mt-5 rounded-xl bg-primary/8 px-4 py-3 text-sm text-tertiary">
          {formError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-tertiary/50">We reply by email and on your request page.</p>
        <button
          type="submit"
          disabled={isSending || uploading > 0}
          className="cta-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-secondary shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-60 motion-reduce:transition-none"
        >
          {isSending ? "Sending..." : "Send request"}
          {!isSending && <ArrowRight aria-hidden="true" className="size-4" />}
        </button>
      </div>
    </form>
  );
};

export default SupportRequestForm;
