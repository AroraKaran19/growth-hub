"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createVenue } from "@/hooks/useAdminCatalogue";
import { readApiError } from "@/libs/api/errors";
import VenueForm from "./components/venue/VenueForm";
import {
  EMPTY_DRAFT,
  errorsFromApi,
  slugFromName,
  toPayload,
  validateDraft,
  type DraftErrors,
  type VenueDraft,
} from "./components/venue/venueDraft";

const AdminVenueNewPage = () => {
  const router = useRouter();
  const [draft, setDraft] = useState<VenueDraft>(EMPTY_DRAFT);
  // The address follows the name until the admin types their own.
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = <K extends keyof VenueDraft>(key: K, value: VenueDraft[K]) => {
    if (key === "slug") setSlugEdited(true);
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === "name" && !slugEdited && { slug: slugFromName(value as string) }),
    }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const found = validateDraft(draft, "create");
    setErrors(found);
    setFormError(Object.keys(found).length > 0 ? "Check the highlighted fields." : null);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    try {
      const venue = await createVenue(toPayload(draft, "create"));
      router.push(`/admin/venues/${venue.slug}`);
    } catch (caught) {
      const mapped = errorsFromApi(readApiError(caught));
      setErrors(mapped.errors);
      setFormError(mapped.formError);
      setIsSaving(false);
    }
  };

  return (
    <>
      <Link
        href="/admin/venues"
        className="inline-flex items-center gap-2 text-sm text-tertiary/60 transition-colors hover:text-tertiary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All venues
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-tertiary">New venue</h1>
      <p className="mt-1 text-sm text-tertiary/60">
        Add the listing now. You assign its seat map and publish it on the next screen.
      </p>

      <VenueForm
        mode="create"
        draft={draft}
        errors={errors}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        status={
          formError && (
            <p role="alert" className="text-sm text-primary">
              {formError}
            </p>
          )
        }
      />
    </>
  );
};

export default AdminVenueNewPage;
