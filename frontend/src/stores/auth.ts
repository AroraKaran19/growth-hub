"use client";

import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import { hasMemberHint } from "@/libs/auth/cookies";
import { SESSION_ENDED_CODES, readAuthError } from "@/libs/auth/errors";
import { logoutThroughRelay, refreshThroughRelay } from "@/libs/auth/requests";
import type { AccountFor, AuthSurface, SessionPayload } from "@/types/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthState<S extends AuthSurface> = {
  status: AuthStatus;
  account: AccountFor<S> | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  bootstrap: () => Promise<void>;
  applySignIn: (payload: SessionPayload<AccountFor<S>>) => void;
  setAccount: (account: AccountFor<S>) => void;
  refresh: () => Promise<string | null>;
  signOut: () => Promise<void>;
  reset: () => void;
};

// Refresh this long before the access token expires, so a request in flight
// never carries an already-dead token.
const REFRESH_LEAD_MS = 60_000;

const SIGNED_OUT = {
  status: "unauthenticated" as const,
  account: null,
  accessToken: null,
  accessTokenExpiresAt: null,
};

export const createAuthStore = <S extends AuthSurface>(surface: S) => {
  let refreshInFlight: Promise<string | null> | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let channel: BroadcastChannel | null = null;

  const clearTimer = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
  };

  const store = createStore<AuthState<S>>()((set, get) => {
    const schedule = (expiresAt: string) => {
      clearTimer();
      const delay = Date.parse(expiresAt) - Date.now() - REFRESH_LEAD_MS;
      refreshTimer = setTimeout(() => void get().refresh(), Math.max(1000, delay));
    };

    const apply = (payload: SessionPayload<AccountFor<S>>) => {
      set({
        status: "authenticated",
        account: payload.account,
        accessToken: payload.accessToken,
        accessTokenExpiresAt: payload.accessTokenExpiresAt,
      });
      schedule(payload.accessTokenExpiresAt);
    };

    // One refresh at a time in this tab, and the Web Lock keeps other tabs
    // from presenting the same cookie at once and tripping reuse detection.
    const runRefresh = async (): Promise<string | null> => {
      const call = async () => {
        try {
          const payload = await refreshThroughRelay(surface);
          apply(payload);
          return payload.accessToken;
        } catch (error) {
          const { code, status } = readAuthError(error);
          const ended = status === 401 || status === 403 || (code && SESSION_ENDED_CODES.includes(code));
          if (ended) {
            clearTimer();
            set(SIGNED_OUT);
          }
          return null;
        }
      };

      if (typeof navigator !== "undefined" && navigator.locks) {
        return navigator.locks.request(`gh-auth-refresh-${surface}`, call);
      }
      return call();
    };

    return {
      status: "loading",
      account: null,
      accessToken: null,
      accessTokenExpiresAt: null,

      bootstrap: async () => {
        // Anonymous visitors have no hint cookie, so public pages skip the call.
        if (surface === "member" && !hasMemberHint()) {
          set(SIGNED_OUT);
          return;
        }
        await get().refresh();
        if (get().status === "loading") set(SIGNED_OUT);
      },

      applySignIn: (payload) => {
        apply(payload);
        channel?.postMessage("signed-in");
      },

      setAccount: (account) => set({ account }),

      refresh: () => {
        refreshInFlight ??= runRefresh().finally(() => {
          refreshInFlight = null;
        });
        return refreshInFlight;
      },

      signOut: async () => {
        clearTimer();
        set(SIGNED_OUT);
        channel?.postMessage("signed-out");
        await logoutThroughRelay(surface);
      },

      reset: () => {
        clearTimer();
        set(SIGNED_OUT);
      },
    };
  });

  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    channel = new BroadcastChannel(`gh-auth-${surface}`);
    channel.onmessage = (event: MessageEvent<string>) => {
      if (event.data === "signed-in") void store.getState().refresh();
      if (event.data === "signed-out") store.getState().reset();
    };
  }

  return store;
};

// A mapped type, so indexing by a generic S yields StoreApi<AuthState<S>>.
// StoreApi is invariant in its state, so a plain object literal would need a
// cast here and the cast would not be sound.
type AuthStores = { [S in AuthSurface]: StoreApi<AuthState<S>> };

export const authStores: AuthStores = {
  member: createAuthStore("member"),
  partner: createAuthStore("partner"),
  admin: createAuthStore("admin"),
};

export const authStoreFor = <S extends AuthSurface>(surface: S) => authStores[surface];

export const useAuthStore = <S extends AuthSurface, U>(
  surface: S,
  selector: (state: AuthState<S>) => U,
): U => useStore(authStoreFor(surface), selector);
