import { AxiosError } from "axios";

export type ApiError = {
  code?: string;
  message: string;
  fields: Record<string, string>;
  /** Extra detail some errors carry, such as the seats that were taken. */
  meta: Record<string, unknown>;
  status?: number;
};

type ErrorBody = {
  error?: { code?: string; message?: string; meta?: { fields?: Record<string, string> } & Record<string, unknown> };
};

const GENERIC = "Something went wrong. Try again.";

export const readApiError = (error: unknown): ApiError => {
  if (!(error instanceof AxiosError)) return { message: GENERIC, fields: {}, meta: {} };
  const body = (error.response?.data as ErrorBody | undefined)?.error;
  return {
    code: body?.code,
    message: body?.message ?? GENERIC,
    fields: body?.meta?.fields ?? {},
    meta: body?.meta ?? {},
    status: error.response?.status,
  };
};
