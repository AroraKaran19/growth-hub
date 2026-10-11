"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import useSWR from "swr";
import { ArrowDown, ArrowUp, MessageSquareQuote, PencilLine, Quote, Trash2 } from "lucide-react";
import { readApiError } from "@/libs/api/errors";
import {
  createTestimonial,
  deleteTestimonial,
  fetchAdminTestimonials,
  reorderTestimonials,
  updateTestimonial,
  type TestimonialInput,
} from "@/libs/api/siteAdmin";
import { toastDone, toastFailed } from "@/libs/toast";
import type { Testimonial } from "@/types/homeContent";
import { cn } from "@/utils";
import { PartnerPageHeader as PageHeader, PartnerSkeleton as Skeleton } from "../Partner/components/PartnerUi";
import ImageField from "./components/settings/ImageField";
import { TextArea, TextInput } from "./components/settings/inputs";
import Toggle from "./components/Toggle";
import { QUIET, RAISED } from "./components/venue/fields";

const EMPTY: TestimonialInput = { quote: "", name: "", role: "", photo: null, visible: true };

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

const toInput = ({ quote, name, role, photo, visible }: Testimonial): TestimonialInput => ({ quote, name, role, photo, visible });

const TestimonialForm = ({ editing, onDone }: { editing: Testimonial | null; onDone: () => Promise<unknown> }) => {
  const [draft, setDraft] = useState<TestimonialInput>(editing ? toInput(editing) : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = {
      ...(!draft.quote.trim() && { quote: "Write the quote." }),
      ...(!draft.name.trim() && { name: "Add the person's name." }),
    };
    setErrors(found);
    if (Object.keys(found).length) return;

    setIsSaving(true);
    try {
      const input = { ...draft, photo: draft.photo?.src ? draft.photo : null };
      if (editing) await updateTestimonial(editing.id, input);
      else await createTestimonial(input);
      toastDone(editing ? `${draft.name} saved.` : `${draft.name} added${draft.visible ? " and shown on the site" : " as hidden"}.`);
      setDraft(EMPTY);
      await onDone();
    } catch (caught) {
      const info = readApiError(caught);
      if (Object.keys(info.fields).length) setErrors(info.fields);
      else toastFailed(info.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={cn(RAISED, "h-fit p-5 sm:p-6")}>
      <div className="flex items-center gap-3">
        <span className="cta-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-secondary">
          <MessageSquareQuote aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-tertiary">{editing ? `Edit ${editing.name}` : "Add a testimonial"}</h2>
          <p className="text-sm text-tertiary/55">Real words from real members only.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <TextArea id="testimonial-quote" label="Quote" value={draft.quote} max={500} rows={4} error={errors.quote} onChange={(quote) => setDraft({ ...draft, quote })} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput id="testimonial-name" label="Name" value={draft.name} max={80} error={errors.name} placeholder="Their name" onChange={(name) => setDraft({ ...draft, name })} />
          <TextInput id="testimonial-role" label="Role (optional)" value={draft.role} max={80} placeholder="Founder, Freelancer..." onChange={(role) => setDraft({ ...draft, role })} />
        </div>
        <ImageField
          id="testimonial-photo"
          label="Photo"
          optional
          aspect="aspect-square"
          hint="Without a photo, their initials show instead."
          value={draft.photo ?? { src: "", alt: "" }}
          onChange={(photo) => setDraft({ ...draft, photo })}
        />
        <Toggle label="Show on the site" checked={draft.visible} onChange={(visible) => setDraft({ ...draft, visible })} />
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="cta-gradient grow rounded-lg px-5 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : editing ? "Save changes" : "Add testimonial"}
        </button>
        {editing && (
          <button type="button" onClick={() => void onDone()} className={cn(QUIET, "text-tertiary/60")}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

const AdminTestimonialsPage = () => {
  const { data, error, isLoading, mutate } = useSWR("admin/testimonials", fetchAdminTestimonials);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const testimonials = data ?? [];

  const run = async (id: string, action: () => Promise<unknown>, message: string) => {
    setBusyId(id);
    try {
      await action();
      await mutate();
      toastDone(message);
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      setBusyId(null);
    }
  };

  const move = (index: number, step: -1 | 1) => {
    const ids = testimonials.map((item) => item.id);
    [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
    void run(testimonials[index].id, () => reorderTestimonials(ids), "Order saved.");
  };

  if (isLoading) return <Skeleton />;

  const shown = testimonials.filter((item) => item.visible).length;

  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Quotes shown on the landing page, in this order. Hidden ones stay here until you switch them on."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <TestimonialForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={async () => {
            setEditing(null);
            await mutate();
          }}
        />

        <section aria-labelledby="testimonials-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="testimonials-heading" className="text-base font-bold text-tertiary">
              On the site
            </h2>
            {!error && <p className="text-sm text-tertiary/55">{shown} shown, {testimonials.length - shown} hidden</p>}
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-sm text-primary">We couldn&apos;t load testimonials. Refresh to try again.</p>
          ) : testimonials.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-tertiary/15 p-10 text-center">
              <Quote aria-hidden="true" className="mx-auto size-8 rotate-180 text-tertiary/25" />
              <p className="mt-3 text-sm text-tertiary/60">No testimonials yet. The section stays hidden on the site until you add one.</p>
            </div>
          ) : (
            <ol className="mt-3 flex flex-col gap-3">
              {testimonials.map((item, index) => (
                <li key={item.id} className={cn("rounded-2xl border border-tertiary/8 bg-secondary p-5 shadow-md shadow-tertiary/5 transition-shadow hover:shadow-lg", !item.visible && "opacity-60")}>
                  <div className="flex gap-4">
                    {item.photo ? (
                      <Image src={item.photo.src} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-tertiary text-sm font-semibold text-secondary">{initials(item.name)}</span>
                    )}
                    <div className="min-w-0 grow">
                      <p className="line-clamp-3 text-sm leading-relaxed text-tertiary">&ldquo;{item.quote}&rdquo;</p>
                      <p className="mt-2 text-sm font-semibold text-tertiary">
                        {item.name}
                        {item.role && <span className="font-normal text-tertiary/55"> · {item.role}</span>}
                      </p>
                    </div>
                  </div>

                  {confirmDelete === item.id ? (
                    <div role="alert" className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-primary/5 p-3 text-sm text-tertiary">
                      Delete this testimonial for good?
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void run(item.id, () => deleteTestimonial(item.id), `${item.name}'s testimonial deleted.`).then(() => setConfirmDelete(null))}
                        className={cn(QUIET, "text-primary")}
                      >
                        Yes, delete
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className={cn(QUIET, "text-tertiary/60")}>
                        Keep it
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-tertiary/8 pt-3.5">
                      <Toggle
                        label={item.visible ? "Shown" : "Hidden"}
                        checked={item.visible}
                        onChange={(visible) =>
                          void run(item.id, () => updateTestimonial(item.id, { ...toInput(item), visible }), visible ? `${item.name} is shown on the site.` : `${item.name} is hidden.`)
                        }
                      />
                      <div className="flex items-center gap-1.5">
                        <button type="button" aria-label="Move up" disabled={index === 0 || busyId !== null} onClick={() => move(index, -1)} className="rounded-lg p-2 text-tertiary/60 transition-colors hover:bg-tertiary/5 hover:text-tertiary disabled:opacity-30">
                          <ArrowUp aria-hidden="true" className="size-4" />
                        </button>
                        <button type="button" aria-label="Move down" disabled={index === testimonials.length - 1 || busyId !== null} onClick={() => move(index, 1)} className="rounded-lg p-2 text-tertiary/60 transition-colors hover:bg-tertiary/5 hover:text-tertiary disabled:opacity-30">
                          <ArrowDown aria-hidden="true" className="size-4" />
                        </button>
                        <button type="button" aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)} className="rounded-lg p-2 text-tertiary/60 transition-colors hover:bg-tertiary/5 hover:text-tertiary">
                          <PencilLine aria-hidden="true" className="size-4" />
                        </button>
                        <button type="button" aria-label={`Delete ${item.name}`} onClick={() => setConfirmDelete(item.id)} className="rounded-lg p-2 text-primary/70 transition-colors hover:bg-primary/5 hover:text-primary">
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
};

export default AdminTestimonialsPage;
