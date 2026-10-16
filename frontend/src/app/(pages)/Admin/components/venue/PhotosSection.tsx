"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, X } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import { IMAGE_TYPES, UploadError, uploadImage } from "@/libs/api/uploads";
import { readApiError } from "@/libs/api/errors";
import { cn } from "@/utils";
import { QUIET, Section } from "./fields";
import { uploadEach, uploadNotice } from "./galleryUpload";
import { MIN_GALLERY_PHOTOS } from "./venueDraft";

const MAX_GALLERY = 12;

type PhotosSectionProps = {
  /** The venue's address, used as the upload folder. Empty until it is valid. */
  ownerId: string;
  image: string;
  gallery: string[];
  coverError?: string;
  galleryError?: string;
  onCover: (url: string) => void;
  onGallery: (urls: string[]) => void;
};

const messageFor = (error: unknown) =>
  error instanceof UploadError ? error.message : readApiError(error).message;

const PhotosSection = ({ ownerId, image, gallery, coverError, galleryError, onCover, onGallery }: PhotosSectionProps) => {
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"cover" | "gallery" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUpload = Boolean(ownerId) && busy === null;
  const accept = IMAGE_TYPES.join(",");

  const uploadCover = async (file: File | undefined) => {
    if (!file) return;
    setBusy("cover");
    setError(null);
    try {
      onCover(await uploadImage(file, "venue-cover", ownerId));
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(null);
    }
  };

  const uploadGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_GALLERY - gallery.length;
    const picked = [...files].slice(0, room);
    setBusy("gallery");
    setError(null);

    // Reorder and remove are locked while busy, so gallery is still current here.
    const { added, failed } = await uploadEach(
      picked,
      (file) => uploadImage(file, "venue-gallery", ownerId),
      messageFor,
    );
    if (added.length > 0) onGallery([...gallery, ...added]);
    setError(uploadNotice(failed, files.length - picked.length));
    setBusy(null);
  };

  const isLocked = busy === "gallery";

  const move = (index: number, step: -1 | 1) => {
    const next = [...gallery];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    onGallery(next);
  };

  return (
    <Section
      title="Photos"
      hint="The cover shows on cards and search. Gallery photos show on the venue page, in this order."
    >
      {!ownerId && (
        <p className="mb-4 rounded-xl bg-tertiary/5 px-3.5 py-2.5 text-sm text-tertiary/70">
          Enter the venue&apos;s web address first; photos are stored under it.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-medium text-tertiary">Cover</p>
          <div className="relative mt-2 aspect-4/3 overflow-hidden rounded-xl border border-tertiary/10 bg-tertiary/5">
            {image ? (
              <Image src={image} alt="Cover photo" fill sizes="220px" className="object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-sm text-tertiary/45">
                No cover yet
              </span>
            )}
            {busy === "cover" && (
              <span className="absolute inset-0 flex items-center justify-center bg-secondary/70">
                <LoaderCircle aria-label="Uploading" className="size-6 animate-spin text-primary" />
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={!canUpload}
            onClick={() => coverInput.current?.click()}
            className={cn(QUIET, "mt-2.5 text-primary")}
          >
            {image ? "Replace cover" : "Upload cover"}
          </button>
          <input
            ref={coverInput}
            type="file"
            accept={accept}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              void uploadCover(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {coverError && <p className="mt-1.5 text-sm text-primary">{coverError}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-tertiary">
              Gallery
              <RequiredMark />{" "}
              <span className="font-normal text-tertiary/45">
                ({gallery.length} of {MAX_GALLERY}, at least {MIN_GALLERY_PHOTOS})
              </span>
            </p>
            <button
              type="button"
              disabled={!canUpload || gallery.length >= MAX_GALLERY}
              onClick={() => galleryInput.current?.click()}
              className={cn(QUIET, "inline-flex items-center gap-1.5 text-primary")}
            >
              {busy === "gallery" ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <ImagePlus aria-hidden="true" className="size-4" />
              )}
              {busy === "gallery" ? "Uploading..." : "Add photos"}
            </button>
            <input
              ref={galleryInput}
              type="file"
              accept={accept}
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                void uploadGallery(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          {gallery.length === 0 ? (
            <p
              className={cn(
                "mt-2 rounded-xl border border-dashed p-6 text-center text-sm",
                galleryError ? "border-primary/40 bg-primary/3 text-primary" : "border-tertiary/15 text-tertiary/50",
              )}
            >
              No gallery photos yet. Add at least {MIN_GALLERY_PHOTOS}.
            </p>
          ) : (
            <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {gallery.map((url, index) => (
                <li
                  key={`${url}-${index}`}
                  className="group relative aspect-4/3 overflow-hidden rounded-xl border border-tertiary/10"
                >
                  <Image src={url} alt={`Gallery photo ${index + 1}`} fill sizes="200px" className="object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-tertiary/70 px-1.5 py-1 text-secondary">
                    <span className="flex">
                      <button
                        type="button"
                        disabled={index === 0 || isLocked}
                        onClick={() => move(index, -1)}
                        aria-label={`Move photo ${index + 1} earlier`}
                        className="rounded p-1 hover:bg-secondary/15 disabled:opacity-30"
                      >
                        <ChevronLeft aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === gallery.length - 1 || isLocked}
                        onClick={() => move(index, 1)}
                        aria-label={`Move photo ${index + 1} later`}
                        className="rounded p-1 hover:bg-secondary/15 disabled:opacity-30"
                      >
                        <ChevronRight aria-hidden="true" className="size-4" />
                      </button>
                    </span>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => onGallery(gallery.filter((_, item) => item !== index))}
                      aria-label={`Remove photo ${index + 1}`}
                      className="rounded p-1 hover:bg-secondary/15 disabled:opacity-30"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {galleryError && (
            <p role="alert" className="mt-1.5 text-sm text-primary">
              {galleryError}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-primary">
          {error}
        </p>
      )}
    </Section>
  );
};

export default PhotosSection;
