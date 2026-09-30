"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, Pencil } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import {
  GENDER_OPTIONS,
  INDUSTRY_OPTIONS,
  WORK_TYPE_OPTIONS,
  labelFor,
} from "@/data/profileOptions";
import { useBookings } from "@/hooks/useBookings";
import { useMemberships } from "@/hooks/useMemberships";
import { usePublishedVenues } from "@/hooks/useVenues";
import { memberApi } from "@/libs/api/client";
import { readApiError } from "@/libs/api/errors";
import { useAuthStore } from "@/stores/auth";
import type { MemberAccount } from "@/types/auth";
import { isLiveMembership } from "@/types/membership";
import type { SelectOption } from "@/types/search";
import { cn } from "@/utils";
import { todayIso } from "@/utils/date";
import { localityOptionsFrom } from "@/utils/venues";
import {
  errorsFromApi,
  memberNumber,
  memberSince,
  toDraft,
  toPatch,
  validateDraft,
  type ProfileDraft,
  type ProfileErrors,
} from "./profileDraft";
import { toStatsBooking } from "./bookingAdapter";
import { profileStats } from "./profileStats";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

type FieldKey = keyof ProfileDraft;

type Field = {
  label: string;
  key: FieldKey;
  type?: string;
  autoComplete?: string;
  /** Fixed sets render as a dropdown rather than a free-text box. */
  options?: SelectOption[];
  /** Shown under the box while editing. */
  hint?: string;
};

type Section = {
  title: string;
  fields: Field[];
  showMobile?: boolean;
  showMemberships?: boolean;
};

const SECTIONS: Section[] = [
  {
    title: "Personal Details",
    showMobile: true,
    fields: [
      { label: "Full Name", key: "name", autoComplete: "name" },
      {
        label: "Date of Birth",
        key: "dateOfBirth",
        type: "date",
        autoComplete: "bday",
      },
      {
        label: "Email Address",
        key: "email",
        type: "email",
        autoComplete: "email",
        hint: "Booking confirmations, receipts and payment updates are emailed here.",
      },
      { label: "Gender", key: "gender", options: GENDER_OPTIONS },
    ],
  },
  {
    title: "Company Details",
    fields: [
      {
        label: "Company Name",
        key: "companyName",
        autoComplete: "organization",
      },
      {
        label: "Job Title",
        key: "jobTitle",
        autoComplete: "organization-title",
      },
      { label: "Industry", key: "industry", options: INDUSTRY_OPTIONS },
      { label: "Work Type", key: "workType", options: WORK_TYPE_OPTIONS },
    ],
  },
  {
    title: "Account Details",
    showMemberships: true,
    fields: [
      // Options come from the venues on sale, filled in at render.
      { label: "Preferred Location", key: "preferredLocation", options: [] },
      {
        label: "Billing Email",
        key: "billingEmail",
        type: "email",
        autoComplete: "email",
        hint: "Invoices show this address. Leave it blank to use your email.",
      },
    ],
  },
];

const formatDate = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatMobile = (countryCode: string, digits: string) => {
  // Indian numbers read as two groups of five.
  const grouped =
    countryCode === "+91" && digits.length === 10
      ? `${digits.slice(0, 5)} ${digits.slice(5)}`
      : digits;
  return `${countryCode} ${grouped}`;
};

const FIELD_BOX =
  "w-full rounded-lg border px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40";
const READ_ONLY_BOX = "cursor-default border-tertiary/12 bg-tertiary/3";
const EDITABLE_BOX =
  "border-tertiary/20 bg-secondary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const FIELD_LABEL = "mb-1.5 block text-sm font-medium text-tertiary";
const FIELD_HINT = "mt-1.5 text-xs text-tertiary/55";

const ProfileView = ({ account }: { account: MemberAccount }) => {
  const setAccount = useAuthStore("member", (state) => state.setAccount);
  // Null while reading; a draft only exists between Edit and Save.
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const { venues } = usePublishedVenues();
  const { bookings } = useBookings();
  const { memberships } = useMemberships();

  const isEditing = draft !== null;
  const value = draft ?? toDraft(account);
  const locations = localityOptionsFrom(venues);
  const stats = profileStats(bookings.map(toStatsBooking));
  const activeMemberships = memberships.filter(isLiveMembership).length;
  const displayName = account.name ?? "Member";

  const tiles = [
    { label: "Total Bookings", value: stats.total },
    { label: "Total Spent", value: stats.spent },
    { label: "Attendance Rate", value: stats.attendance },
    { label: "Time Spent", value: stats.hours },
  ];
  const summary = [
    { label: "Upcoming Booking", value: stats.upcoming },
    { label: "Completed", value: stats.completed },
    { label: "Favourite Hub", value: stats.favouriteHub },
  ];

  const startEditing = () => {
    setDraft(toDraft(account));
    setErrors({});
    setFormError(null);
    setIsSaved(false);
  };

  const stopEditing = () => {
    setDraft(null);
    setErrors({});
    setFormError(null);
  };

  const change = (key: FieldKey, next: string) => {
    setDraft((current) => (current ? { ...current, [key]: next } : current));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const save = async () => {
    if (!draft) return;
    const found = validateDraft(draft, todayIso());
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError("Check the highlighted fields.");
      return;
    }

    const patch = toPatch(draft, account);
    if (Object.keys(patch).length === 0) {
      stopEditing();
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const { data } = await memberApi.patch("/members/me", patch);
      setAccount(data.data.account as MemberAccount);
      stopEditing();
      setIsSaved(true);
    } catch (caught) {
      const info = readApiError(caught);
      const mapped = errorsFromApi(info);
      setErrors(mapped);
      setFormError(
        Object.keys(mapped).length > 0
          ? "Check the highlighted fields."
          : info.message,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tertiary">
            Personal Information
          </h1>
          <p className="mt-1 text-sm text-tertiary/60">
            Manage your personal and professional details.
          </p>
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={stopEditing}
              disabled={isSaving}
              className="rounded-lg border border-tertiary/20 px-4 py-2 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isSaving}
              className="cta-gradient rounded-lg px-4 py-2 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            <Pencil aria-hidden="true" className="size-3.5" />
            Edit Profile
          </button>
        )}
      </div>

      {formError && (
        <p role="alert" className="mt-4 text-sm text-primary">
          {formError}
        </p>
      )}
      {isSaved && !isEditing && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 text-sm text-green-700"
        >
          <CircleCheck aria-hidden="true" className="size-4" />
          Your details are saved.
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-tertiary/10 border-b-2 border-b-primary bg-secondary px-4 py-3.5"
          >
            <dt className="text-sm text-tertiary/60">{stat.label}</dt>
            <dd className="mt-1 text-xl font-bold text-tertiary">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid grid-cols-1 gap-6 rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:p-6">
        <div className="flex flex-col gap-5">
          <div className="feature-card flex flex-col items-center rounded-xl border border-primary/25 p-5 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-tertiary/10 text-lg font-semibold text-tertiary">
              {initials(displayName)}
            </span>
            <p className="mt-3 text-base font-bold text-tertiary">
              {displayName}
            </p>
            <p className="text-xs text-tertiary/55">
              Member ID: {memberNumber(account.id)}
            </p>
            {memberSince(account.createdAt) && (
              <p className="text-xs text-tertiary/55">
                Member since {memberSince(account.createdAt)}
              </p>
            )}
          </div>

          <dl className="flex flex-col gap-3">
            {summary.map((row) => (
              <div key={row.label}>
                <dt className="mb-1.5 text-sm font-medium text-tertiary">
                  {row.label}
                </dt>
                <dd className="rounded-lg border border-tertiary/12 bg-tertiary/3 px-3.5 py-2.5 text-sm text-tertiary/75">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-7">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-bold text-tertiary">
                {section.title}
              </h2>

              <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                {/* Plans are managed on their own page; the profile only
                    counts them. */}
                {section.showMemberships && (
                  <div>
                    <p className={FIELD_LABEL}>Active Memberships</p>
                    <div
                      className={cn(
                        FIELD_BOX,
                        READ_ONLY_BOX,
                        "flex items-center justify-between gap-3",
                      )}
                    >
                      <span>{activeMemberships} active</span>
                      <Link
                        href="/account/memberships"
                        className="inline-flex items-center gap-1 font-medium text-primary transition-opacity hover:opacity-75"
                      >
                        View all
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    </div>
                  </div>
                )}

                {section.fields.map((field) => {
                  const raw = value[field.key];
                  const error = errors[field.key];
                  const options =
                    field.key === "preferredLocation"
                      ? locations
                      : field.options;

                  // Fixed sets get the themed dropdown while editing.
                  if (options && isEditing) {
                    return (
                      <div key={field.key}>
                        <SelectField
                          label={field.label}
                          value={raw}
                          options={options}
                          onChange={(next) => change(field.key, next)}
                        />
                        {error && (
                          <p role="alert" className="mt-1.5 text-xs text-primary">
                            {error}
                          </p>
                        )}
                      </div>
                    );
                  }

                  // A date input needs the ISO value; readers want it spelled out.
                  const shown = options
                    ? labelFor(options, raw)
                    : field.type === "date" && !isEditing && raw
                      ? formatDate(raw)
                      : raw;

                  return (
                    <div key={field.key}>
                      <label htmlFor={field.key} className={FIELD_LABEL}>
                        {field.label}
                      </label>
                      <input
                        // Remounted per mode so a date input is never handed
                        // the spelled-out text while its type switches.
                        key={isEditing ? "edit" : "view"}
                        id={field.key}
                        name={field.key}
                        type={isEditing ? (field.type ?? "text") : "text"}
                        autoComplete={field.autoComplete}
                        max={field.type === "date" ? todayIso() : undefined}
                        value={shown}
                        placeholder={isEditing ? undefined : "Not added yet"}
                        readOnly={!isEditing}
                        // Read-only fields are skipped in the tab order so the
                        // keyboard does not walk through a dozen dead inputs.
                        tabIndex={isEditing ? undefined : -1}
                        aria-invalid={Boolean(error)}
                        aria-describedby={
                          error ? `${field.key}-error` : undefined
                        }
                        onChange={(event) =>
                          change(field.key, event.target.value)
                        }
                        className={cn(
                          FIELD_BOX,
                          isEditing ? EDITABLE_BOX : READ_ONLY_BOX,
                          error && "border-primary",
                        )}
                      />
                      {error ? (
                        <p
                          id={`${field.key}-error`}
                          role="alert"
                          className="mt-1.5 text-xs text-primary"
                        >
                          {error}
                        </p>
                      ) : (
                        isEditing &&
                        field.hint && <p className={FIELD_HINT}>{field.hint}</p>
                      )}
                    </div>
                  );
                })}

                {section.showMobile && (
                  <div>
                    <label htmlFor="mobile" className={FIELD_LABEL}>
                      Mobile Number
                    </label>
                    <input
                      id="mobile"
                      name="mobile"
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={formatMobile(
                        account.phone.countryCode,
                        account.phone.number,
                      )}
                      className={cn(FIELD_BOX, READ_ONLY_BOX)}
                    />
                    {isEditing && (
                      <p className={FIELD_HINT}>
                        This number is your login, so it can&apos;t be changed
                        here. Contact support to move your account.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
};

const ProfilePage = () => {
  const account = useAuthStore("member", (state) => state.account);

  // The account layout only renders this once a member is signed in.
  if (!account) return null;

  return <ProfileView account={account} />;
};

export default ProfilePage;
