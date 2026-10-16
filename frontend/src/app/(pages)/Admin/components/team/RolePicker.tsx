"use client";

import { ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import type { AdminRole } from "@/types/auth";
import { cn } from "@/utils";

const ROLES: { value: AdminRole; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "admin", label: "Admin", hint: "Only the pages you pick", icon: UserRound },
  { value: "super-admin", label: "Super admin", hint: "Every page, including staff", icon: ShieldCheck },
];

type RolePickerProps = {
  value: AdminRole;
  onChange: (role: AdminRole) => void;
  idPrefix: string;
};

const RolePicker = ({ value, onChange, idPrefix }: RolePickerProps) => (
  <fieldset>
    <legend id={`${idPrefix}-label`} className="mb-1.5 block text-sm font-medium text-tertiary">
      Role
      <RequiredMark />
    </legend>
    <div
      role="radiogroup"
      aria-labelledby={`${idPrefix}-label`}
      aria-required="true"
      className="grid grid-cols-2 gap-1 rounded-xl bg-tertiary/5 p-1"
    >
      {ROLES.map((role) => {
        const selected = role.value === value;
        const Icon = role.icon;
        return (
          <button
            key={role.value}
            id={`${idPrefix}-${role.value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(role.value)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all",
              selected ? "bg-tertiary text-secondary shadow-md shadow-tertiary/20" : "text-tertiary/70 hover:bg-secondary hover:text-tertiary",
            )}
          >
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", selected ? "cta-gradient" : "bg-tertiary/8")}>
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{role.label}</span>
              <span className={cn("block truncate text-xs", selected ? "text-secondary/65" : "text-tertiary/50")}>{role.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  </fieldset>
);

export default RolePicker;
