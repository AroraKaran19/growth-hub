import { Check } from "lucide-react";
import { BOOKING_STEPS } from "@/data/bookingOptions";
import { cn } from "@/utils";

const BookingStepper = ({ activeIndex }: { activeIndex: number }) => {
  return (
    <ol className="mx-auto flex w-fit max-w-full items-center gap-2 overflow-x-auto rounded-2xl bg-tertiary/4 px-4 py-2.5 sm:gap-3">
      {BOOKING_STEPS.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;

        return (
          <li key={step.id} className="flex shrink-0 items-center gap-2 sm:gap-3">
            {index > 0 && (
              <span
                aria-hidden="true"
                className="hidden w-10 border-t border-dashed border-tertiary/25 sm:block lg:w-16"
              />
            )}
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                isActive || isDone ? "bg-primary" : "bg-tertiary/20",
              )}
            >
              <Check aria-hidden="true" className="size-3 text-secondary" />
            </span>
            <span
              className={cn(
                "whitespace-nowrap text-sm",
                isActive
                  ? "font-medium text-tertiary"
                  : "text-tertiary/60",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export default BookingStepper;
