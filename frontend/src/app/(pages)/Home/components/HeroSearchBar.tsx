"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import DateField from "@/app/components/ui/form/DateField";
import {
  DURATION_OPTIONS,
  PEOPLE_OPTIONS,
  WORKSPACE_TYPE_OPTIONS,
} from "@/data/searchOptions";
import type { SelectOption, WorkspaceSearchParams } from "@/types/search";
import { cn } from "@/utils";

const HeroSearchBar = ({
  locations,
  className,
}: {
  locations: SelectOption[];
  className?: string;
}) => {
  const router = useRouter();
  const [search, setSearch] = useState<WorkspaceSearchParams>({
    locality: "",
    date: "",
    people: "",
    duration: "",
    type: "",
  });

  const update = <K extends keyof WorkspaceSearchParams>(
    key: K,
    value: WorkspaceSearchParams[K],
  ) => setSearch((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const params = new URLSearchParams();
    Object.entries(search).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const query = params.toString();
    router.push(query ? `/workspaces?${query}` : "/workspaces");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "grid grid-cols-1 items-end gap-x-5 gap-y-4 rounded-3xl bg-secondary p-5 shadow-2xl shadow-tertiary/20 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_1px_repeat(4,minmax(0,1fr))_auto] lg:gap-x-6 lg:p-6",
        className,
      )}
    >
      <SelectField
        label="Location"
        value={search.locality ?? ""}
        onChange={(value) => update("locality", value)}
        options={locations}
      />

      <span
        aria-hidden="true"
        className="hidden w-px self-stretch bg-tertiary/12 lg:block"
      />

      <DateField
        label="Booking Date"
        value={search.date ?? ""}
        onChange={(value) => update("date", value)}
      />

      <SelectField
        label="People"
        value={search.people ?? ""}
        onChange={(value) => update("people", value)}
        options={PEOPLE_OPTIONS}
      />

      <SelectField
        label="Duration"
        value={search.duration ?? ""}
        onChange={(value) =>
          update("duration", value as WorkspaceSearchParams["duration"])
        }
        options={DURATION_OPTIONS}
      />

      <SelectField
        label="Workspace Type"
        value={search.type ?? ""}
        onChange={(value) =>
          update("type", value as WorkspaceSearchParams["type"])
        }
        options={WORKSPACE_TYPE_OPTIONS}
      />

      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-accent sm:col-span-2 lg:col-span-1"
      >
        Search Workspace
        <ArrowRight className="size-4" />
      </button>
    </form>
  );
};

export default HeroSearchBar;
