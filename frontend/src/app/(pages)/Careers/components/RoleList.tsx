"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Mail } from "lucide-react";
import { ROLES } from "@/data/careers";
import { CONTACT } from "@/data/footer";
import { cn } from "@/utils";

const TEAMS = ["All teams", ...new Set(ROLES.map((role) => role.team))];

const RoleList = () => {
  const [team, setTeam] = useState(TEAMS[0]);
  const roles =
    team === TEAMS[0] ? ROLES : ROLES.filter((role) => role.team === team);

  return (
    <div>
      <div role="group" aria-label="Filter roles by team" className="flex flex-wrap gap-2">
        {TEAMS.map((item) => {
          const isActive = item === team;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={isActive}
              onClick={() => setTeam(item)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm transition-colors",
                isActive
                  ? "border-transparent bg-primary font-medium text-secondary"
                  : "border-tertiary/15 text-tertiary/75 hover:border-tertiary/35 hover:text-tertiary",
              )}
            >
              {item}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-tertiary/60">
        {roles.length} open {roles.length === 1 ? "role" : "roles"}
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {roles.map((role) => (
          <li key={role.id}>
            <details className="group rounded-2xl border border-tertiary/10 bg-secondary open:border-primary/30">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-tertiary">
                    {role.title}
                  </h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tertiary/60">
                    <span>{role.team}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin aria-hidden="true" className="size-3.5" />
                      {role.location}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        role.type === "Internship"
                          ? "bg-amber-500/15 text-amber-700"
                          : "bg-green-500/12 text-green-700",
                      )}
                    >
                      {role.type}
                    </span>
                  </p>
                </div>
                <ChevronDown
                  aria-hidden="true"
                  className="size-5 shrink-0 text-tertiary/50 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <div className="border-t border-tertiary/8 px-5 pb-6 pt-5 sm:px-6">
                <p className="text-sm leading-relaxed text-tertiary/75">
                  {role.summary}
                </p>
                <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-tertiary">
                      What you will do
                    </h4>
                    <ul className="mt-2 flex flex-col gap-2">
                      {role.responsibilities.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-tertiary/70">
                          <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-tertiary">
                      What you bring
                    </h4>
                    <ul className="mt-2 flex flex-col gap-2">
                      {role.requirements.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-tertiary/70">
                          <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <a
                  href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(`Application: ${role.title}`)}`}
                  className="cta-gradient mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
                >
                  <Mail aria-hidden="true" className="size-4" />
                  Apply for this role
                </a>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RoleList;
