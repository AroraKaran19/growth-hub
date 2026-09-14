import { cn } from "@/utils";

type SectionHeadingProps = {
  title: string;
  description?: string;
  align?: "center" | "left";
  tone?: "light" | "dark";
  className?: string;
};

/** Section title and intro, matching the homepage sections. */
const SectionHeading = ({
  title,
  description,
  align = "center",
  tone = "light",
  className,
}: SectionHeadingProps) => {
  const isDark = tone === "dark";

  return (
    <div
      className={cn(
        "flex flex-col",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      <h2
        className={cn(
          "text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[40px]",
          isDark ? "text-secondary" : "text-tertiary",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-3 max-w-2xl text-sm text-pretty",
            isDark ? "text-secondary/70" : "text-tertiary/70",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;
