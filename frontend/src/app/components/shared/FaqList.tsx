import { ChevronDown } from "lucide-react";
import type { Faq } from "@/data/faqs";

/** Native disclosure widgets: keyboard and screen reader support for free. */
const FaqList = ({ faqs }: { faqs: Faq[] }) => {
  return (
    <div className="divide-y divide-tertiary/10 rounded-2xl border border-tertiary/10 bg-secondary">
      {faqs.map((faq) => (
        <details key={faq.question} className="group px-5 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-medium text-tertiary [&::-webkit-details-marker]:hidden">
            {faq.question}
            <ChevronDown
              aria-hidden="true"
              className="size-5 shrink-0 text-tertiary/50 transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <p className="pb-5 text-sm leading-relaxed text-tertiary/70">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
};

export default FaqList;
