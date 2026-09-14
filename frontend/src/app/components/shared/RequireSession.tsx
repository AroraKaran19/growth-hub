"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/stores/session";

/** Sends signed-out visitors to log in, then back to where they were headed. */
const RequireSession = ({ children }: { children: ReactNode }) => {
  const { session, isReady } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, session, pathname, router]);

  if (!isReady || !session) {
    return (
      <div
        aria-busy="true"
        aria-label="Checking your sign-in"
        className="h-96 animate-pulse rounded-2xl border border-tertiary/10 bg-surface"
      />
    );
  }

  return <>{children}</>;
};

export default RequireSession;
