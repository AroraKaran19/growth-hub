import Image from "next/image";
import Link from "next/link";
import type { WorkspaceCategory } from "@/types/category";
import { cn } from "@/utils";

const CategoryCard = ({
  category,
  isActive,
}: {
  category: WorkspaceCategory;
  isActive: boolean;
}) => {
  return (
    <article className="relative aspect-300/381 w-full overflow-hidden rounded-2xl">
      <Image
        src={category.image}
        alt={category.name}
        fill
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 85vw"
        className="object-cover select-none"
        draggable={false}
      />

      <div className="absolute inset-0 bg-linear-to-t from-tertiary/85 via-tertiary/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="text-xl font-medium text-secondary">
          {category.name}
        </h3>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
            isActive
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <p className="mt-1.5 text-sm leading-snug text-secondary/85">
              {category.description}
            </p>
            <Link
              href={`/book?workspaceType=${category.slug}`}
              tabIndex={isActive ? undefined : -1}
              className="mt-3 inline-block text-xs font-semibold uppercase tracking-wider text-primary"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default CategoryCard;
