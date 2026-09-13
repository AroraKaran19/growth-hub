import { Navigation } from "lucide-react";
import { cn } from "@/utils";

type DirectionsLinkProps = {
  url: string;
  label?: string;
  className?: string;
};

const DirectionsLink = ({
  url,
  label = "Get directions",
  className,
}: DirectionsLinkProps) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5",
        className,
      )}
    >
      <Navigation aria-hidden="true" className="size-4" />
      {label}
      <span className="sr-only"> (opens Google Maps in a new tab)</span>
    </a>
  );
};

export default DirectionsLink;
