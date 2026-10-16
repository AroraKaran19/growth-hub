"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Armchair,
  Building2,
  ExternalLink,
  FileText,
  Images,
  LayoutGrid,
  ListOrdered,
  LogIn,
  Megaphone,
  MessageSquareQuote,
  Search,
  Sparkles,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { fetchAdminHome } from "@/libs/api/siteAdmin";
import type { HomeOverrides, HomeSectionKey } from "@/types/homeContent";
import { cn } from "@/utils";
import { PartnerPageHeader as PageHeader, PartnerSkeleton as Skeleton } from "../Partner/components/PartnerUi";
import SectionEditor from "./components/settings/SectionEditor";
import { SeoForm, SeoPagesForm } from "./components/settings/seoForms";
import {
  AmenitiesForm,
  CommunityForm,
  CtaForm,
  FeaturesForm,
  HeadingForm,
  HeroForm,
  SigninForm,
  StepsForm,
} from "./components/settings/sectionForms";

const SECTIONS: { key: HomeSectionKey; label: string; hint: string; icon: LucideIcon }[] = [
  { key: "hero", label: "Hero", hint: "The first screen: announcement pill, headline, line under it and the background photo.", icon: Sparkles },
  { key: "discover", label: "Discover workspaces", hint: "The heading above the venue cards. The cards themselves come from published venues.", icon: Building2 },
  { key: "features", label: "Features", hint: "The heading and six feature cards on the dark band.", icon: LayoutGrid },
  { key: "categories", label: "Workspace categories", hint: "The heading above the category carousel.", icon: Armchair },
  { key: "steps", label: "How it works", hint: "The heading and four steps. Steps are numbered automatically.", icon: ListOrdered },
  { key: "amenities", label: "Amenities", hint: "The heading and background photo behind the amenity icons.", icon: Wifi },
  { key: "community", label: "Community photos", hint: "The heading and six photos in the mosaic. The layout stays the same.", icon: Images },
  { key: "testimonials", label: "Testimonials", hint: "The heading beside the testimonial carousel.", icon: MessageSquareQuote },
  { key: "cta", label: "Bottom banner", hint: "The banner near the footer, also shown on About, Locations, Memberships and Pricing.", icon: Megaphone },
  { key: "signin", label: "Sign-in screens", hint: "The photo beside the sign-in form for customers, venue partners and admins.", icon: LogIn },
  { key: "seo", label: "SEO and sharing", hint: "Site name, search copy, share image, favicon and search engine settings.", icon: Search },
  { key: "seoPages", label: "Page titles", hint: "The search title and description of each public page. Venue pages use their own name and description.", icon: FileText },
];

const AdminSettingsPage = () => {
  const { data, error, isLoading, mutate } = useSWR("admin/site/home", fetchAdminHome);
  const [active, setActive] = useState<HomeSectionKey>("hero");
  const [unsaved, setUnsaved] = useState<Partial<Record<HomeSectionKey, boolean>>>({});
  const overrides: HomeOverrides = data ?? {};
  const onSaved = (next: HomeOverrides) => void mutate(next, { revalidate: false });
  const hasUnsaved = Object.values(unsaved).some(Boolean);

  const onDirtyChange = useCallback(
    (section: HomeSectionKey, isDirty: boolean) =>
      setUnsaved((current) => (Boolean(current[section]) === isDirty ? current : { ...current, [section]: isDirty })),
    [],
  );

  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  if (isLoading) return <Skeleton />;

  const shared = (key: HomeSectionKey) => {
    const meta = SECTIONS.find((section) => section.key === key)!;
    return { title: meta.label, hint: meta.hint, overrides, onSaved, onDirtyChange };
  };

  // Every editor stays mounted, so switching sections never loses a draft.
  const editors: Record<HomeSectionKey, ReactNode> = {
    hero: <SectionEditor section="hero" {...shared("hero")}>{(draft, set, errors) => <HeroForm draft={draft} set={set} errors={errors} />}</SectionEditor>,
    discover: <SectionEditor section="discover" {...shared("discover")}>{(draft, set, errors) => <HeadingForm id="discover" draft={draft} set={set} errors={errors} />}</SectionEditor>,
    features: <SectionEditor section="features" {...shared("features")}>{(draft, set, errors) => <FeaturesForm draft={draft} set={set} errors={errors} />}</SectionEditor>,
    categories: (
      <>
        <SectionEditor section="categories" {...shared("categories")}>{(draft, set, errors) => <HeadingForm id="categories" draft={draft} set={set} errors={errors} />}</SectionEditor>
        <Link href="/admin/workspace-types" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Edit the workspace types themselves
        </Link>
      </>
    ),
    steps: <SectionEditor section="steps" {...shared("steps")}>{(draft, set, errors) => <StepsForm draft={draft} set={set} errors={errors} />}</SectionEditor>,
    amenities: (
      <>
        <SectionEditor section="amenities" {...shared("amenities")}>{(draft, set, errors) => <AmenitiesForm draft={draft} set={set} errors={errors} />}</SectionEditor>
        <Link href="/admin/amenities" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Manage the amenities themselves
        </Link>
      </>
    ),
    community: <SectionEditor section="community" {...shared("community")}>{(draft, set, errors) => <CommunityForm draft={draft} set={set} errors={errors} />}</SectionEditor>,
    testimonials: (
      <>
        <SectionEditor section="testimonials" {...shared("testimonials")}>{(draft, set, errors) => <HeadingForm id="testimonials" draft={draft} set={set} errors={errors} />}</SectionEditor>
        <Link href="/admin/testimonials" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Manage the testimonials themselves
        </Link>
      </>
    ),
    cta: <SectionEditor section="cta" {...shared("cta")}>{(draft, set, errors) => <CtaForm draft={draft} set={set} errors={errors} />}</SectionEditor>,
    signin: <SectionEditor section="signin" {...shared("signin")}>{(draft, set, errors) => <SigninForm draft={draft} set={set} errors={errors} />}</SectionEditor>,
    seo: <SectionEditor section="seo" {...shared("seo")}>{(draft, set, errors) => <SeoForm draft={draft} set={set} errors={errors} />}</SectionEditor>,
    seoPages: <SectionEditor section="seoPages" {...shared("seoPages")}>{(draft, set, errors) => <SeoPagesForm draft={draft} set={set} errors={errors} />}</SectionEditor>,
  };

  return (
    <>
      <PageHeader
        title="Site settings"
        description="Edit the landing page, sign-in screens and how the site shows in search. Unedited sections keep their built-in copy, and saved changes show on the site straight away."
        actions={
          <Link href="/" target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary/65 hover:text-tertiary">
            View landing page
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </Link>
        }
      />

      {error ? (
        <p role="alert" className="mt-6 text-sm text-primary">We couldn&apos;t load the site settings. Refresh to try again.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav aria-label="Landing page sections" className="lg:sticky lg:top-24">
            <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {SECTIONS.map((section, index) => {
                const Icon = section.icon;
                const isActive = section.key === active;
                return (
                  <li key={section.key} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setActive(section.key)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-all",
                        isActive
                          ? "bg-tertiary text-secondary shadow-lg shadow-tertiary/20"
                          : "text-tertiary/75 hover:-translate-y-0.5 hover:bg-secondary hover:shadow-sm",
                      )}
                    >
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", isActive ? "cta-gradient" : "bg-tertiary/5")}>
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="grow font-medium">{section.label}</span>
                      {unsaved[section.key] && (
                        <span title="Unsaved changes" className="size-2 rounded-full bg-primary">
                          <span className="sr-only">Unsaved changes</span>
                        </span>
                      )}
                      <span className={cn("text-xs", isActive ? "text-secondary/50" : "text-tertiary/35")}>{String(index + 1).padStart(2, "0")}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="min-w-0">
            {SECTIONS.map((section) => (
              <div key={section.key} hidden={section.key !== active} className="flex flex-col gap-6">
                {editors[section.key]}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSettingsPage;
