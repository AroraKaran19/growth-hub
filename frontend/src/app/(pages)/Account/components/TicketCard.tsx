import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/utils";

export const TICKET_ACTION =
  "cta-gradient inline-flex items-center gap-2 rounded-lg px-7 py-2.5 text-sm text-secondary transition-opacity hover:opacity-90";
export const TICKET_LINK =
  "text-sm font-medium text-tertiary underline underline-offset-4 transition-opacity hover:opacity-70";

const DETAIL_LABEL = "text-sm text-tertiary/55";
const DETAIL_VALUE = "mt-0.5 truncate text-sm text-tertiary";

// A page-coloured disc straddling the card edge. Only its inner half is
// painted, so it covers the card border and draws the arc in its place.
const NOTCH =
  "absolute -mt-px size-5 -translate-y-1/2 rounded-full border border-tertiary/10 bg-secondary";

type TicketDetail = { label: string; value: ReactNode };

type TicketCardProps = {
  image: string;
  imageAlt: string;
  title: string;
  subtitle: string;
  /** Sits beside the title, e.g. a status pill. */
  badge?: ReactNode;
  actions: ReactNode;
  /** Up to four, laid out in the design's fixed columns. */
  details: TicketDetail[];
  summary: TicketDetail;
};

const TicketCard = ({
  image,
  imageAlt,
  title,
  subtitle,
  badge,
  actions,
  details,
  summary,
}: TicketCardProps) => {
  return (
    <article className="relative rounded-2xl border border-tertiary/10 bg-secondary px-5 py-5 sm:px-6">
      <div className="flex gap-5 sm:gap-7">
        <div className="relative size-20 shrink-0 overflow-hidden sm:size-28">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>

        <div className="flex min-w-0 grow flex-col">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="truncate text-xl font-medium text-tertiary">
                  {title}
                </h3>
                {badge}
              </div>
              <p className="mt-0.5 truncate text-sm text-tertiary/75">
                {subtitle}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-6">{actions}</div>
          </div>

          {/* The notches carry no top offset, so they sit on this rule (their
              static position) while left/right resolve against the card. */}
          <div
            aria-hidden="true"
            className="mt-3.5 border-t border-dashed border-tertiary/15"
          >
            <span
              className={cn(NOTCH, "left-[-11px] [clip-path:inset(0_0_0_50%)]")}
            />
            <span
              className={cn(NOTCH, "right-[-11px] [clip-path:inset(0_50%_0_0)]")}
            />
          </div>

          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pt-3.5">
            <dl className="grid grow grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 xl:grid-cols-[9rem_10.5rem_9.5rem_minmax(0,1fr)] xl:gap-x-0">
              {details.map((detail) => (
                <div key={detail.label} className="min-w-0">
                  <dt className={DETAIL_LABEL}>{detail.label}</dt>
                  <dd className={DETAIL_VALUE}>{detail.value}</dd>
                </div>
              ))}
            </dl>

            <dl className="sm:mt-2.5">
              <dt className={DETAIL_LABEL}>{summary.label}</dt>
              <dd className="mt-0.5 text-base text-tertiary">
                {summary.value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </article>
  );
};

export default TicketCard;
