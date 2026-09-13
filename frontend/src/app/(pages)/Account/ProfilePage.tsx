"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Pencil } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { MEMBER } from "@/data/member";
import { MEMBER_MEMBERSHIPS } from "@/data/memberMemberships";
import {
  COUNTRY_CODE_OPTIONS,
  GENDER_OPTIONS,
  INDUSTRY_OPTIONS,
  WORK_TYPE_OPTIONS,
  labelFor,
} from "@/data/profileOptions";
import { LOCATION_OPTIONS } from "@/data/searchOptions";
import type { SelectOption } from "@/types/search";
import type { MemberProfile } from "@/types/member";
import { cn } from "@/utils";

const MOBILE_DIGITS = 10;

const ACTIVE_MEMBERSHIPS = MEMBER_MEMBERSHIPS.filter(
  (membership) => membership.status === "active",
).length;

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

type FieldKey = keyof MemberProfile;

type Field = {
  label: string;
  key: FieldKey;
  type?: string;
  autoComplete?: string;
  /** Fixed sets render as a dropdown rather than a free-text box. */
  options?: SelectOption[];
};

type Section = {
  title: string;
  fields: Field[];
  showMemberships?: boolean;
};

const SECTIONS: Section[] = [
  {
    // The mockup labelled this "Company Name", but it holds personal details.
    title: "Personal Details",
    fields: [
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
      },
      { label: "Gender", key: "gender", options: GENDER_OPTIONS },
      {
        label: "Mobile Number",
        key: "mobile",
        type: "tel",
        autoComplete: "tel-national",
      },
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
      {
        label: "Preferred Location",
        key: "preferredLocation",
        options: LOCATION_OPTIONS,
      },
      {
        label: "Billing Email",
        key: "billingEmail",
        type: "email",
        autoComplete: "email",
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

/** Digits only, capped at ten. A pasted number that still carries the
 *  selected country code has that prefix dropped rather than truncated. */
const toNationalDigits = (input: string, countryCode: string) => {
  const digits = input.replace(/\D/g, "");
  const code = countryCode.replace(/\D/g, "");
  const national =
    digits.length > MOBILE_DIGITS && digits.startsWith(code)
      ? digits.slice(code.length)
      : digits;
  return national.slice(0, MOBILE_DIGITS);
};

const SUMMARY: { label: string; key: FieldKey }[] = [
  { label: "Upcoming Booking", key: "upcomingBookings" },
  { label: "Completed", key: "completedBookings" },
  { label: "Favourite Hub", key: "favouriteHub" },
  { label: "Reward Points", key: "rewardPoints" },
];

const FIELD_BOX =
  "w-full rounded-lg border px-3.5 py-2.5 text-sm text-tertiary outline-none transition-colors";
const READ_ONLY_BOX = "cursor-default border-tertiary/12 bg-tertiary/3";
const EDITABLE_BOX =
  "border-tertiary/20 bg-secondary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const FIELD_LABEL = "mb-1.5 block text-sm font-medium text-tertiary";

const ProfilePage = () => {
  const [profile, setProfile] = useState<MemberProfile>(MEMBER);
  const [draft, setDraft] = useState<MemberProfile>(MEMBER);
  const [isEditing, setIsEditing] = useState(false);

  const value = isEditing ? draft : profile;

  const startEditing = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const save = () => {
    // Local only for now; there is no members API to persist to.
    setProfile(draft);
    setIsEditing(false);
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
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-tertiary/20 px-4 py-2 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="cta-gradient rounded-lg px-4 py-2 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
            >
              Save changes
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

      <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {profile.stats.map((stat) => (
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
              {initials(profile.name)}
            </span>
            <p className="mt-3 text-base font-bold text-tertiary">
              {profile.name}
            </p>
            <p className="text-xs text-tertiary/55">
              Member ID: {profile.memberId}
            </p>
            <p className="text-xs text-tertiary/55">
              Member since {profile.memberSince}
            </p>
          </div>

          <dl className="flex flex-col gap-3">
            {SUMMARY.map((row) => (
              <div key={row.key}>
                <dt className="mb-1.5 text-sm font-medium text-tertiary">
                  {row.label}
                </dt>
                <dd className="rounded-lg border border-tertiary/12 bg-tertiary/3 px-3.5 py-2.5 text-sm text-tertiary/75">
                  {String(profile[row.key])}
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
                      <span>{ACTIVE_MEMBERSHIPS} active</span>
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
                  const readOnly = !isEditing;
                  const raw = String(value[field.key]);

                  // Fixed sets get the themed dropdown while editing.
                  if (field.options && !readOnly) {
                    return (
                      <SelectField
                        key={field.key}
                        label={field.label}
                        value={raw}
                        options={field.options}
                        onChange={(next) =>
                          setDraft((current) => ({
                            ...current,
                            [field.key]: next,
                          }))
                        }
                      />
                    );
                  }

                  // The dialling code is picked apart from the national number.
                  if (field.type === "tel" && !readOnly) {
                    return (
                      <div key={field.key}>
                        <label htmlFor={field.key} className={FIELD_LABEL}>
                          {field.label}
                        </label>
                        <div className="flex gap-2">
                          <SelectField
                            label="Country code"
                            hideLabel
                            value={draft.mobileCountryCode}
                            options={COUNTRY_CODE_OPTIONS}
                            onChange={(next) =>
                              setDraft((current) => ({
                                ...current,
                                mobileCountryCode: next,
                              }))
                            }
                            className="w-28 shrink-0"
                          />
                          {/* No maxLength: the browser would cut the raw text
                              before spaces and a pasted +91 are stripped. */}
                          <input
                            id={field.key}
                            name={field.key}
                            type="tel"
                            inputMode="numeric"
                            autoComplete={field.autoComplete}
                            pattern={`[0-9]{${MOBILE_DIGITS}}`}
                            placeholder="10-digit number"
                            value={draft.mobile}
                            onChange={(event) => {
                              const mobile = toNationalDigits(
                                event.target.value,
                                draft.mobileCountryCode,
                              );
                              setDraft((current) => ({ ...current, mobile }));
                            }}
                            className={cn(FIELD_BOX, EDITABLE_BOX, "min-w-0")}
                          />
                        </div>
                      </div>
                    );
                  }

                  // A date input needs the ISO value; readers want it spelled out.
                  const shown = field.options
                    ? labelFor(field.options, raw)
                    : field.type === "tel"
                      ? formatMobile(value.mobileCountryCode, raw)
                      : field.type === "date" && readOnly
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
                        key={readOnly ? "view" : "edit"}
                        id={field.key}
                        name={field.key}
                        type={readOnly ? "text" : (field.type ?? "text")}
                        autoComplete={field.autoComplete}
                        value={shown}
                        readOnly={readOnly}
                        // Read-only fields are skipped in the tab order so the
                        // keyboard does not walk through a dozen dead inputs.
                        tabIndex={readOnly ? -1 : undefined}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        className={cn(
                          FIELD_BOX,
                          readOnly ? READ_ONLY_BOX : EDITABLE_BOX,
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
