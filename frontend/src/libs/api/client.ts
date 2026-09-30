"use client";

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { authStoreFor } from "@/stores/auth";
import type { AuthErrorBody, AuthSurface } from "@/types/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const RETRYABLE = ["ACCESS_TOKEN_EXPIRED", "ACCESS_TOKEN_INVALID"];

type Retryable = InternalAxiosRequestConfig & { _retried?: boolean };

const errorCode = (error: AxiosError) =>
  (error.response?.data as { error?: AuthErrorBody } | undefined)?.error?.code;

export const createApiClient = (surface: AuthSurface): AxiosInstance => {
  const client = axios.create({ baseURL: BASE_URL });
  const store = authStoreFor(surface);

  client.interceptors.request.use((config) => {
    const { accessToken } = store.getState();
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as Retryable | undefined;
      const code = errorCode(error);

      if (code === "SESSION_REVOKED" || code === "ACCOUNT_DISABLED") {
        store.getState().reset();
        return Promise.reject(error);
      }
      if (surface === "admin" && code === "PERMISSION_DENIED" && !config?.url?.endsWith("/auth/me")) {
        void client
          .get("/auth/me")
          .then(({ data }) => store.getState().setAccount(data.data.account))
          .catch(() => undefined);
        return Promise.reject(error);
      }
      if (error.response?.status !== 401 || !config || config._retried || !code || !RETRYABLE.includes(code)) {
        return Promise.reject(error);
      }

      config._retried = true;
      const accessToken = await store.getState().refresh();
      if (!accessToken) return Promise.reject(error);
      config.headers.Authorization = `Bearer ${accessToken}`;
      return client.request(config);
    },
  );

  return client;
};

export const memberApi = createApiClient("member");
export const partnerApi = createApiClient("partner");
export const adminApi = createApiClient("admin");

/** No Bearer token: OTP claims and code requests run before any session. */
export const publicApi = axios.create({ baseURL: BASE_URL });
