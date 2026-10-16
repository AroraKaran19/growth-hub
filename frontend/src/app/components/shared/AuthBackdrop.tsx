import Image from "next/image";
import type { SiteImage } from "@/types/homeContent";
import { cn } from "@/utils";

type AuthBackdropProps = {
  image: SiteImage;
  /** Where the brand glow sits when no photo is set. */
  glow?: "top-right" | "bottom-left";
};

/** The sign-in panel's backdrop: the admin's photo under a dark fade, or the brand glow. */
const AuthBackdrop = ({ image, glow = "top-right" }: AuthBackdropProps) =>
  image.src ? (
    <>
      <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 55vw, 0px" priority className="object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-tertiary via-tertiary/85 to-tertiary/25" />
    </>
  ) : (
    <div
      aria-hidden="true"
      className={cn(
        "cta-banner absolute size-128 rounded-full opacity-40 blur-3xl",
        glow === "top-right" ? "-right-40 -top-40" : "-bottom-40 -left-40",
      )}
    />
  );

export default AuthBackdrop;
