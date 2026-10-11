"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { IMAGE_TYPES, UploadError, uploadImage } from "@/libs/api/uploads";
import { readApiError } from "@/libs/api/errors";
import type { SiteImage } from "@/types/homeContent";
import { cn } from "@/utils";
import { LABEL, QUIET, inputClass } from "../venue/fields";

type ImageFieldProps = {
  id: string;
  label: string;
  value: SiteImage;
  onChange: (next: SiteImage) => void;
  hint?: string;
  /** Lets the admin clear the image, for optional photos. */
  optional?: boolean;
  aspect?: string;
};

/** Uploads straight to S3 through a presigned ticket, or takes a pasted URL. */
const ImageField = ({ id, label, value, onChange, hint, optional, aspect = "aspect-video" }: ImageFieldProps) => {
  const input = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      onChange({ ...value, src: await uploadImage(file, "landing", "home") });
    } catch (caught) {
      setError(caught instanceof UploadError ? caught.message : readApiError(caught).message);
    } finally {
      setIsUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <p className={LABEL}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-tertiary/45">(optional)</span>}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={isUploading}
          aria-label={value.src ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          className={cn(
            "group relative w-full shrink-0 overflow-hidden rounded-xl border border-dashed border-tertiary/20 bg-tertiary/3 transition-all hover:-translate-y-0.5 hover:border-tertiary/40 hover:shadow-md sm:w-56",
            aspect,
          )}
        >
          {value.src && <Image src={value.src} alt="" fill sizes="224px" className="object-cover" />}
          <span
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-xs font-medium transition-opacity",
              value.src ? "bg-tertiary/55 text-secondary opacity-0 group-hover:opacity-100" : "text-tertiary/60",
            )}
          >
            {isUploading ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <ImagePlus aria-hidden="true" className="size-5" />}
            {isUploading ? "Uploading..." : value.src ? "Replace" : "Upload image"}
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => void upload(event.target.files?.[0])}
        />

        <div className="flex min-w-0 grow flex-col gap-2.5">
          <div>
            <label htmlFor={`${id}-src`} className="mb-1 block text-xs text-tertiary/55">
              Or paste an image link
            </label>
            <input
              id={`${id}-src`}
              value={value.src}
              onChange={(event) => onChange({ ...value, src: event.target.value })}
              placeholder="https://..."
              className={inputClass(false)}
            />
          </div>
          <div>
            <label htmlFor={`${id}-alt`} className="mb-1 block text-xs text-tertiary/55">
              <span className="font-medium text-tertiary/75">Alt text</span>: describes the image for screen readers and search engines
            </label>
            <input
              id={`${id}-alt`}
              value={value.alt}
              maxLength={160}
              onChange={(event) => onChange({ ...value, alt: event.target.value })}
              placeholder="What the photo shows"
              className={inputClass(false)}
            />
          </div>
          {optional && value.src && (
            <button type="button" onClick={() => onChange({ src: "", alt: "" })} className={cn(QUIET, "inline-flex w-fit items-center gap-1.5 text-primary")}>
              <Trash2 aria-hidden="true" className="size-3.5" />
              Remove image
            </button>
          )}
        </div>
      </div>
      {(error || hint) && <p className={cn("mt-1.5 text-sm", error ? "text-primary" : "text-tertiary/55")}>{error ?? hint}</p>}
    </div>
  );
};

export default ImageField;
