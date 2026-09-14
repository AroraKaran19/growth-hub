"use client";

import { useSyncExternalStore } from "react";
import { AuthRequestError } from "@/libs/auth/requests";

const SCRIPT_URL = "https://verify.msg91.com/otp-provider.js";
const CAPTCHA_ID = "msg91-captcha";
const READY_POLL_MS = 100;
const READY_MAX_ATTEMPTS = 100;

export type WidgetStatus = "idle" | "loading" | "ready" | "unavailable";

type Msg91Response = {
  message?: string;
  type?: string;
  reqId?: string;
  token?: string;
};
type Msg91Callback = (response: Msg91Response) => void;

declare global {
  interface Window {
    initSendOTP?: (config: {
      widgetId: string;
      tokenAuth: string;
      exposeMethods: boolean;
      captchaRenderId?: string;
      success: Msg91Callback;
      failure: Msg91Callback;
    }) => void;
    sendOtp?: (identifier: string, success: Msg91Callback, failure: Msg91Callback) => void;
    retryOtp?: (
      channel: string | null,
      success: Msg91Callback,
      failure: Msg91Callback,
      reqId?: string,
    ) => void;
    verifyOtp?: (
      otp: string,
      success: Msg91Callback,
      failure: Msg91Callback,
      reqId?: string,
    ) => void;
  }
}

let status: WidgetStatus = "idle";
// MSG91 ties a resend and a verify back to the send that started them.
let currentReqId: string | null = null;
const listeners = new Set<() => void>();

const setStatus = (next: WidgetStatus) => {
  status = next;
  listeners.forEach((listener) => listener());
};

const methodsAttached = () =>
  Boolean(window.sendOtp && window.retryOtp && window.verifyOtp);

const waitForMethods = () => {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (methodsAttached()) {
      clearInterval(timer);
      setStatus("ready");
    } else if (attempts >= READY_MAX_ATTEMPTS) {
      clearInterval(timer);
      setStatus("unavailable");
    }
  }, READY_POLL_MS);
};

const ensureLoaded = () => {
  if (typeof window === "undefined" || status !== "idle") return;

  const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
  const tokenAuth = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;
  if (!widgetId || !tokenAuth) {
    setStatus("unavailable");
    return;
  }

  setStatus("loading");
  const script = document.createElement("script");
  script.src = SCRIPT_URL;
  script.async = true;
  script.onload = () => {
    if (!window.initSendOTP) {
      setStatus("unavailable");
      return;
    }
    window.initSendOTP({
      widgetId,
      tokenAuth,
      exposeMethods: true,
      captchaRenderId: CAPTCHA_ID,
      // The widget throws "success callback function missing" without these,
      // even though every result is delivered to the per-call callbacks below.
      success: () => {},
      failure: () => {},
    });
    // initSendOTP returns before it attaches window.sendOtp and friends.
    waitForMethods();
  };
  script.onerror = () => setStatus("unavailable");
  document.body.appendChild(script);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  ensureLoaded();
  return () => {
    listeners.delete(listener);
  };
};

const readMessage = (response: Msg91Response) => response?.message ?? "";

// A send answers with the request id either as reqId or as the message body.
const readReqId = (response: Msg91Response) =>
  response?.reqId ?? (response?.type === "success" ? response?.message : null) ?? null;

const rejection = (code: string, fallback: string, response?: Msg91Response) =>
  new AuthRequestError({ code, message: readMessage(response ?? {}) || fallback });

const failureMessage = {
  send: "We couldn't send the code. Try again.",
  retry: "We couldn't resend the code. Try again.",
  verify: "That code is incorrect or has expired.",
};

const sendOtp = (digits: string) =>
  new Promise<string>((resolve, reject) => {
    if (!window.sendOtp) {
      reject(rejection("OTP_PROVIDER_UNAVAILABLE", failureMessage.send));
      return;
    }
    window.sendOtp(
      digits,
      (response) => {
        currentReqId = readReqId(response);
        resolve(readMessage(response));
      },
      (response) => reject(rejection("SMS_SEND_FAILED", failureMessage.send, response)),
    );
  });

const retryOtp = () =>
  new Promise<string>((resolve, reject) => {
    if (!window.retryOtp) {
      reject(rejection("OTP_PROVIDER_UNAVAILABLE", failureMessage.retry));
      return;
    }
    window.retryOtp(
      null,
      (response) => {
        currentReqId = readReqId(response) ?? currentReqId;
        resolve(readMessage(response));
      },
      (response) => reject(rejection("SMS_SEND_FAILED", failureMessage.retry, response)),
      currentReqId ?? undefined,
    );
  });

const verifyOtp = (code: string) =>
  new Promise<string>((resolve, reject) => {
    if (!window.verifyOtp) {
      reject(rejection("OTP_PROVIDER_UNAVAILABLE", failureMessage.verify));
      return;
    }
    window.verifyOtp(
      code,
      // On success the access token arrives as the message body.
      (response) => resolve(response?.token ?? readMessage(response)),
      (response) => reject(rejection("OTP_INVALID", failureMessage.verify, response)),
      currentReqId ?? undefined,
    );
  });

export const MSG91_CAPTCHA_ID = CAPTCHA_ID;

export const useMsg91Widget = () => {
  const widgetStatus = useSyncExternalStore(
    subscribe,
    () => status,
    () => "idle" as WidgetStatus,
  );

  return { status: widgetStatus, sendOtp, retryOtp, verifyOtp };
};
