import type { CSSProperties } from "react";
import { CalendarDays } from "lucide-react";
import { CardHeading, QuietLink, RAISED_CARD, REVEAL, plural, revealDelay } from "@/app/components/shared/OverviewUi";
import type { PartnerOverview } from "@/types/overview";
import { cn } from "@/utils";
import { formatMonthDay, isoToUtc } from "@/utils/date";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WeekAhead = ({ days, style }: { days: PartnerOverview["nextDays"]; style?: CSSProperties }) => {
  const max = Math.max(1, ...days.map((day) => day.bookings));
  const total = days.reduce((sum, day) => sum + day.bookings, 0);
  return (
    <section aria-label="Next 7 days" className={cn(RAISED_CARD, REVEAL, "p-5 sm:p-6")} style={style}>
      <CardHeading
        icon={CalendarDays}
        title="Next 7 days"
        hint={`${plural(total, "booking")} so far`}
        action={<QuietLink href="/partner/bookings">Bookings</QuietLink>}
      />
      <ol className="mt-6 grid h-44 grid-cols-7 items-end gap-2 sm:gap-3">
        {days.map((day, index) => {
          const weekday = index === 0 ? "Today" : WEEKDAYS[new Date(isoToUtc(day.date)).getUTCDay()];
          return (
            <li
              key={day.date}
              aria-label={`${weekday}, ${formatMonthDay(day.date)}: ${plural(day.bookings, "booking")}, ${plural(day.people, "person", "people")}`}
              className="flex h-full flex-col items-center gap-1.5"
            >
              <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs font-semibold text-tertiary">{day.bookings}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    REVEAL,
                    "max-h-[calc(100%-1.25rem)] w-full max-w-10 rounded-t-lg transition-colors",
                    index === 0 ? "cta-gradient" : day.bookings ? "bg-primary/25 hover:bg-primary/40" : "bg-tertiary/8",
                  )}
                  style={{ height: day.bookings ? `${Math.max(8, (day.bookings / max) * 100)}%` : 4, ...revealDelay(index) }}
                />
              </div>
              <span aria-hidden="true" className={cn("text-[11px]", index === 0 ? "font-semibold text-tertiary" : "text-tertiary/55")}>
                {weekday}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default WeekAhead;
