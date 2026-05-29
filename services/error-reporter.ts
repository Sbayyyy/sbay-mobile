import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { API_BASE_URL } from "@/services/api";

type Extras = Record<string, unknown>;

type GlobalErrorUtils = {
  getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

const getGlobalErrorUtils = () =>
  (globalThis as typeof globalThis & { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;

const TOKEN_STORAGE_KEY = "sbay.auth.token";
const MAX_QUEUE_SIZE = 20;
const seen = new Set<string>();
let currentUser: { id: string; email?: string } | null = null;
let initialized = false;
let sending = false;
let queue: Array<{
  level: "warning" | "error" | "critical";
  message: string;
  error?: unknown;
  extras?: Extras;
}> = [];

function isDev() {
  return process.env.NODE_ENV === "development" || __DEV__;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || error.name,
      exceptionType: error.name,
      stackTrace: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

function getAppVersion() {
  const version = Constants.expoConfig?.version;
  const nativeBuild =
    Platform.OS === "android"
      ? Constants.expoConfig?.android?.versionCode
      : Constants.expoConfig?.ios?.buildNumber;
  return nativeBuild ? `${version ?? "unknown"} (${nativeBuild})` : version;
}

async function sendLog(item: (typeof queue)[number]) {
  const normalized = item.error ? normalizeError(item.error) : { message: item.message };
  const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY).catch(() => null);

  await fetch(`${API_BASE_URL}/api/client-logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      level: item.level,
      source: "mobile",
      message: normalized.message || item.message,
      exceptionType: normalized.exceptionType,
      stackTrace: normalized.stackTrace,
      appVersion: getAppVersion(),
      platform: Platform.OS,
      deviceId: Constants.sessionId,
      url: "sbay://app",
      context: {
        userId: currentUser?.id,
        email: currentUser?.email,
        appOwnership: Constants.appOwnership,
        executionEnvironment: Constants.executionEnvironment,
        ...item.extras,
      },
    }),
  });
}

async function flushQueue() {
  if (sending) return;
  sending = true;
  try {
    while (queue.length > 0) {
      const item = queue[0];
      try {
        await sendLog(item);
        queue.shift();
      } catch {
        break;
      }
    }
  } finally {
    sending = false;
  }
}

function enqueue(item: (typeof queue)[number]) {
  const normalized = item.error ? normalizeError(item.error) : { message: item.message };
  const key = `${item.level}:${normalized.message}:${normalized.stackTrace ?? ""}`.slice(0, 500);
  if (seen.has(key)) return;
  seen.add(key);
  if (seen.size > 100) {
    const first = seen.values().next().value;
    if (first) seen.delete(first);
  }

  queue = [...queue, item].slice(-MAX_QUEUE_SIZE);
  void flushQueue();
}

export const ErrorReporter = {
  init(): void {
    if (initialized) return;
    initialized = true;
    const errorUtils = getGlobalErrorUtils();
    const previousHandler = errorUtils?.getGlobalHandler?.();
    errorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      enqueue({
        level: isFatal ? "critical" : "error",
        message: isFatal ? "Fatal mobile exception" : "Unhandled mobile exception",
        error,
        extras: { isFatal },
      });
      previousHandler?.(error, isFatal);
    });
    void flushQueue();
  },

  captureException(error: unknown, extras?: Extras): void {
    if (isDev()) {
      console.error("[ErrorReporter]", error, extras);
    }
    enqueue({ level: "error", message: "Unhandled mobile exception", error, extras });
  },

  captureMessage(message: string, extras?: Extras): void {
    if (isDev()) {
      console.warn("[ErrorReporter]", message, extras);
    }
    enqueue({ level: "warning", message, extras });
  },

  setUser(user: { id: string; email?: string } | null): void {
    currentUser = user;
  },
};
