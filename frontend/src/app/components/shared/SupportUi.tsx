import Image from "next/image";
import { Check, Headset, UserRound } from "lucide-react";
import { SUPPORT_STATUS_LABELS, type SupportAttachment, type SupportStatus } from "@/types/support";
import { cn } from "@/utils";

const PILL: Record<SupportStatus, string> = {
  open: "bg-amber-500/15 text-amber-800",
  "in-progress": "bg-blue-600/12 text-blue-700",
  resolved: "bg-green-500/12 text-green-700",
  closed: "bg-tertiary/8 text-tertiary/65",
};

const DOT: Record<SupportStatus, string> = {
  open: "bg-amber-500",
  "in-progress": "bg-blue-600",
  resolved: "bg-green-600",
  closed: "bg-tertiary/40",
};

export const SupportStatusPill = ({ status, className }: { status: SupportStatus; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", PILL[status], className)}>
    <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT[status])} />
    {SUPPORT_STATUS_LABELS[status]}
  </span>
);

const STEPS: SupportStatus[] = ["open", "in-progress", "resolved"];

/** Where a request stands; closed fills the whole track. */
export const SupportStepper = ({ status, tone = "light" }: { status: SupportStatus; tone?: "light" | "dark" }) => {
  const reached = status === "closed" ? STEPS.length : STEPS.indexOf(status) + 1;
  const dark = tone === "dark";
  return (
    <ol aria-label="Request progress" className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((step, index) => {
        const done = index < reached;
        const current = index === reached - 1 && status !== "closed";
        return (
          <li key={step} className="flex items-center gap-1.5">
            <span
              aria-current={current ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                done
                  ? current
                    ? "cta-gradient text-secondary shadow-sm shadow-primary/30"
                    : dark
                      ? "bg-secondary/15 text-secondary"
                      : "bg-tertiary/8 text-tertiary"
                  : dark
                    ? "bg-secondary/5 text-secondary/45 ring-1 ring-secondary/10"
                    : "bg-surface text-tertiary/45 ring-1 ring-tertiary/8",
              )}
            >
              {done && !current && <Check aria-hidden="true" className="size-3" />}
              {SUPPORT_STATUS_LABELS[step]}
            </span>
            {index < STEPS.length - 1 && (
              <span aria-hidden="true" className={cn("h-px w-3 sm:w-5", dark ? "bg-secondary/20" : "bg-tertiary/15")} />
            )}
          </li>
        );
      })}
      {status === "closed" && (
        <li>
          <span className={cn("ml-1 rounded-full px-3 py-1 text-xs font-medium", dark ? "bg-secondary/15 text-secondary" : "bg-tertiary text-secondary")}>
            Closed
          </span>
        </li>
      )}
    </ol>
  );
};

const INDIA_DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const supportDateTime = (iso: string) => INDIA_DATE_TIME.format(new Date(iso));

/** "5 min", "3 h", "2 d": how long ago, for list rows. */
export const ageLabel = (iso: string, now = Date.now()) => {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
};

export const AttachmentStrip = ({ attachments, className }: { attachments: SupportAttachment[]; className?: string }) =>
  attachments.length ? (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {attachments.map((attachment, index) => (
        <li key={attachment.url}>
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block size-20 overflow-hidden rounded-xl bg-surface ring-1 ring-tertiary/10 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            <Image src={attachment.url} alt={`Screenshot ${index + 1}`} fill sizes="80px" className="object-cover" />
            <span className="sr-only">Opens in a new tab</span>
          </a>
        </li>
      ))}
    </ul>
  ) : null;

export type TimelineItem = {
  key: string;
  kind: "message" | "status";
  side: "customer" | "growth-hub";
  author: string;
  at: string;
  message: string;
  from?: SupportStatus | null;
  to?: SupportStatus | null;
  attachments?: SupportAttachment[];
};

const statusLine = (item: TimelineItem, viewer: "customer" | "admin") => {
  if (item.side === "customer" && item.to === "open") {
    return viewer === "customer" ? "Reopened by your follow-up" : `${item.author} reopened this with a follow-up`;
  }
  return item.to ? `${item.author} marked this ${SUPPORT_STATUS_LABELS[item.to].toLowerCase()}` : "Status changed";
};

/** The conversation: the customer on the left, Growth Hub on the right, status changes between. */
export const SupportTimeline = ({ items, viewer }: { items: TimelineItem[]; viewer: "customer" | "admin" }) => (
  <ol className="flex flex-col gap-4">
    {items.map((item, index) => {
      const style = { animationDelay: `${Math.min(index, 10) * 50}ms` };
      if (item.kind === "status") {
        return (
          <li key={item.key} style={style} className="flex animate-[fade-up_0.35s_ease-out_both] justify-center motion-reduce:animate-none">
            <span className="inline-flex flex-wrap items-center justify-center gap-x-2 rounded-full bg-surface px-3.5 py-1.5 text-center text-xs text-tertiary/65 ring-1 ring-tertiary/8">
              {statusLine(item, viewer)}
              <span className="text-tertiary/40">{supportDateTime(item.at)}</span>
            </span>
          </li>
        );
      }
      const ours = item.side === "growth-hub";
      const Icon = ours ? Headset : UserRound;
      return (
        <li
          key={item.key}
          style={style}
          className={cn("flex animate-[fade-up_0.35s_ease-out_both] gap-3 motion-reduce:animate-none", ours && "flex-row-reverse")}
        >
          <span
            aria-hidden="true"
            className={cn(
              "mt-1 grid size-9 shrink-0 place-items-center rounded-full shadow-sm",
              ours ? "cta-gradient text-secondary" : "bg-secondary text-tertiary/70 ring-1 ring-tertiary/10",
            )}
          >
            <Icon className="size-4" />
          </span>
          <div className={cn("flex min-w-0 max-w-[85%] flex-col", ours && "items-end")}>
            <p className={cn("flex flex-wrap items-baseline gap-x-2 text-xs", ours && "justify-end")}>
              <span className="font-semibold text-tertiary">{item.author}</span>
              <span className="text-tertiary/45">{supportDateTime(item.at)}</span>
            </p>
            <div
              className={cn(
                "mt-1.5 rounded-2xl px-4 py-3 text-sm shadow-sm",
                ours
                  ? "rounded-tr-md bg-tertiary text-secondary shadow-tertiary/15"
                  : "rounded-tl-md bg-secondary text-tertiary ring-1 ring-tertiary/8",
              )}
            >
              <p className="whitespace-pre-line wrap-break-word">{item.message}</p>
            </div>
            {item.attachments && <AttachmentStrip attachments={item.attachments} className="mt-2" />}
          </div>
        </li>
      );
    })}
  </ol>
);
