"use client";

import type { HomeContent, SiteImage, SiteLink } from "@/types/homeContent";
import Toggle from "../Toggle";
import IconPicker from "./IconPicker";
import ImageField from "./ImageField";
import { TextArea, TextInput } from "./inputs";
import type { Errors } from "./SectionEditor";

type FormProps<K extends keyof HomeContent> = {
  draft: HomeContent[K];
  set: (next: HomeContent[K]) => void;
  errors: Errors;
};

const Heading = ({
  id,
  value,
  onChange,
  errors,
}: {
  id: string;
  value: { title: string; subtitle: string };
  onChange: (next: { title: string; subtitle: string }) => void;
  errors: Errors;
}) => (
  <div className="grid grid-cols-1 gap-4">
    <TextInput id={`${id}-title`} label="Heading" value={value.title} max={90} error={errors.title} onChange={(title) => onChange({ ...value, title })} />
    <TextArea
      id={`${id}-subtitle`}
      label="Line under the heading"
      value={value.subtitle}
      max={300}
      rows={2}
      error={errors.subtitle}
      onChange={(subtitle) => onChange({ ...value, subtitle })}
    />
  </div>
);

const LinkFields = ({ id, label, value, onChange, errors, prefix }: { id: string; label: string; value: SiteLink; onChange: (next: SiteLink) => void; errors: Errors; prefix: string }) => (
  <div className="grid grid-cols-1 gap-4 rounded-xl border border-tertiary/10 bg-tertiary/2 p-4 sm:grid-cols-2">
    <TextInput id={`${id}-label`} label={`${label} text`} value={value.label} max={40} error={errors[`${prefix}.label`]} onChange={(text) => onChange({ ...value, label: text })} />
    <TextInput id={`${id}-href`} label={`${label} link`} value={value.href} max={300} placeholder="/workspaces" error={errors[`${prefix}.href`]} onChange={(href) => onChange({ ...value, href })} />
  </div>
);

const ItemCard = ({ number, children }: { number: number; children: React.ReactNode }) => (
  <div className="relative rounded-xl border border-tertiary/10 bg-secondary p-4 pl-14 shadow-sm">
    <span className="cta-gradient absolute left-4 top-4 flex size-7 items-center justify-center rounded-full text-xs font-semibold text-secondary">
      {number}
    </span>
    <div className="flex flex-col gap-4">{children}</div>
  </div>
);

export const HeroForm = ({ draft, set, errors }: FormProps<"hero">) => (
  <>
    <div className="rounded-xl border border-tertiary/10 bg-tertiary/2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-tertiary">Announcement pill</p>
        <Toggle label={draft.pill.show ? "Shown" : "Hidden"} checked={draft.pill.show} onChange={(show) => set({ ...draft, pill: { ...draft.pill, show } })} />
      </div>
      {draft.pill.show && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput id="hero-pill" label="Pill text" value={draft.pill.text} max={90} error={errors["pill.text"]} onChange={(text) => set({ ...draft, pill: { ...draft.pill, text } })} />
          <TextInput
            id="hero-pill-href"
            label="Pill link (optional)"
            value={draft.pill.href}
            max={300}
            placeholder="/memberships"
            error={errors["pill.href"]}
            onChange={(href) => set({ ...draft, pill: { ...draft.pill, href } })}
          />
        </div>
      )}
    </div>
    <TextInput id="hero-title" label="Headline" value={draft.title} max={90} error={errors.title} onChange={(title) => set({ ...draft, title })} />
    <TextArea id="hero-subtitle" label="Line under the headline" value={draft.subtitle} max={300} rows={2} error={errors.subtitle} onChange={(subtitle) => set({ ...draft, subtitle })} />
    <ImageField id="hero-image" label="Background photo" value={draft.image} hint="A wide photo, at least 1920 pixels across." onChange={(image) => set({ ...draft, image })} />
  </>
);

export const HeadingForm = <K extends "discover" | "categories" | "testimonials">({ draft, set, errors, id }: FormProps<K> & { id: string }) => (
  <Heading id={id} value={draft} errors={errors} onChange={(next) => set({ ...draft, ...next })} />
);

export const FeaturesForm = ({ draft, set, errors }: FormProps<"features">) => {
  const setCard = (index: number, next: Partial<HomeContent["features"]["cards"][number]>) =>
    set({ ...draft, cards: draft.cards.map((card, at) => (at === index ? { ...card, ...next } : card)) });
  return (
    <>
      <Heading id="features" value={draft} errors={errors} onChange={(next) => set({ ...draft, ...next })} />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {draft.cards.map((card, index) => (
          <ItemCard key={index} number={index + 1}>
            <TextInput id={`feature-${index}-title`} label="Title" value={card.title} max={60} error={errors[`cards.${index}.title`]} onChange={(title) => setCard(index, { title })} />
            <TextArea
              id={`feature-${index}-description`}
              label="Description"
              value={card.description}
              max={220}
              rows={2}
              error={errors[`cards.${index}.description`]}
              onChange={(description) => setCard(index, { description })}
            />
            <IconPicker label="Icon" value={card.icon} onChange={(icon) => setCard(index, { icon })} />
          </ItemCard>
        ))}
      </div>
    </>
  );
};

export const StepsForm = ({ draft, set, errors }: FormProps<"steps">) => {
  const setStep = (index: number, next: Partial<HomeContent["steps"]["items"][number]>) =>
    set({ ...draft, items: draft.items.map((step, at) => (at === index ? { ...step, ...next } : step)) });
  return (
    <>
      <Heading id="steps" value={draft} errors={errors} onChange={(next) => set({ ...draft, ...next })} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {draft.items.map((step, index) => (
          <ItemCard key={index} number={index + 1}>
            <TextInput id={`step-${index}-title`} label="Title" value={step.title} max={40} error={errors[`items.${index}.title`]} onChange={(title) => setStep(index, { title })} />
            <TextArea
              id={`step-${index}-description`}
              label="Description"
              value={step.description}
              max={180}
              rows={2}
              error={errors[`items.${index}.description`]}
              onChange={(description) => setStep(index, { description })}
            />
          </ItemCard>
        ))}
      </div>
    </>
  );
};

export const AmenitiesForm = ({ draft, set, errors }: FormProps<"amenities">) => (
  <>
    <Heading id="amenities" value={draft} errors={errors} onChange={(next) => set({ ...draft, ...next })} />
    <ImageField id="amenities-image" label="Background photo" value={draft.image} hint="Shown blurred and dark behind the amenities." onChange={(image) => set({ ...draft, image })} />
  </>
);

const COMMUNITY_SLOTS = ["Wide, top left", "Small, top middle", "Tall, right", "Small, bottom left", "Small, bottom middle", "Small, bottom right"];

export const CommunityForm = ({ draft, set, errors }: FormProps<"community">) => {
  const setPhoto = (index: number, photo: SiteImage) => set({ ...draft, photos: draft.photos.map((item, at) => (at === index ? photo : item)) });
  return (
    <>
      <Heading id="community" value={draft} errors={errors} onChange={(next) => set({ ...draft, ...next })} />
      <div className="grid grid-cols-1 gap-4">
        {draft.photos.map((photo, index) => (
          <ImageField
            key={index}
            id={`community-${index}`}
            label={`Photo ${index + 1}: ${COMMUNITY_SLOTS[index]}`}
            value={photo}
            aspect={index === 2 ? "aspect-[3/4]" : "aspect-video"}
            onChange={(next) => setPhoto(index, next)}
          />
        ))}
      </div>
    </>
  );
};

export const CtaForm = ({ draft, set, errors }: FormProps<"cta">) => (
  <>
    <TextInput id="cta-title" label="Heading" value={draft.title} max={90} error={errors.title} onChange={(title) => set({ ...draft, title })} />
    <TextArea id="cta-text" label="Text" value={draft.text} max={300} rows={2} error={errors.text} onChange={(text) => set({ ...draft, text })} />
    <LinkFields id="cta-primary" label="Main button" prefix="primary" value={draft.primary} errors={errors} onChange={(primary) => set({ ...draft, primary })} />
    <LinkFields id="cta-secondary" label="Second button" prefix="secondary" value={draft.secondary} errors={errors} onChange={(secondary) => set({ ...draft, secondary })} />
  </>
);
