import { cn } from "@/utils";

type ViewSwitchProps<V extends string> = {
  value: V;
  onChange: (value: V) => void;
  /** A badge shows the count waiting in that view. */
  views: { value: V; label: string; badge?: number }[];
};

/** Switches an admin list between its records and related views. */
const ViewSwitch = <V extends string>({ value, onChange, views }: ViewSwitchProps<V>) => (
  <div role="tablist" aria-label="View" className="inline-flex flex-wrap rounded-xl border border-tertiary/10 bg-secondary p-1 shadow-sm">
    {views.map((view) => (
      <button
        key={view.value}
        role="tab"
        type="button"
        aria-selected={value === view.value}
        onClick={() => onChange(view.value)}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          value === view.value ? "bg-tertiary text-secondary" : "text-tertiary/65 hover:text-tertiary",
        )}
      >
        {view.label}
        {Boolean(view.badge) && (
          <span className="cta-gradient rounded-full px-2 py-0.5 text-xs font-semibold text-secondary">{view.badge}</span>
        )}
      </button>
    ))}
  </div>
);

export default ViewSwitch;
