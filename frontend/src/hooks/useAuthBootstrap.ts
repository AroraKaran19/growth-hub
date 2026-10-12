"use client";

import { useEffect } from "react";
import { hasHint } from "@/libs/auth/cookies";
import { authStoreFor } from "@/stores/auth";
import type { AuthSurface } from "@/types/auth";

/**
 * Restores the session once per surface, and again when a tab comes back with
 * an access token that has already expired.
 */
export const useAuthBootstrap = (surface: AuthSurface, enabled = true, onlyWithHint = false) => {
  useEffect(() => {
    if (!enabled) return;
    const store = authStoreFor(surface);
    if (onlyWithHint && !hasHint(surface)) {
      store.getState().reset();
      return;
    }
    void store.getState().bootstrap();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const { status, accessTokenExpiresAt } = store.getState();
      if (status !== "authenticated") return;
      if (!accessTokenExpiresAt || Date.parse(accessTokenExpiresAt) <= Date.now()) {
        void store.getState().refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [surface, enabled, onlyWithHint]);
};
