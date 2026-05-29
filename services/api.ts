import Constants from "expo-constants";
import { notifyUnauthorized, refreshAuthToken } from "@/services/auth-session";

const fallbackBaseUrl = "https://api.syrian-bay.com";

const extraBaseUrl =
  (Constants.expoConfig as { extra?: { apiBaseUrl?: string } } | null)?.extra
    ?.apiBaseUrl ?? null;

const rawBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? extraBaseUrl ?? fallbackBaseUrl;

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

type ApiErrorPayload = {
  code?: string;
  message?: string;
  title?: string;
  errors?: Record<string, string[] | string>;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_DELAYS_MS = [1_000, 3_000];

type ApiRequestInit = RequestInit & {
  skipAuthRefresh?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestInit = {},
): Promise<T> {
  const { skipAuthRefresh, timeoutMs = REQUEST_TIMEOUT_MS, maxRetries, ...requestOptions } = options;

  const method = requestOptions.method?.toUpperCase() ?? "GET";
  const isIdempotent = method === "GET" || method === "HEAD";
  const retries = maxRetries ?? (isIdempotent ? 2 : 0);

  const headers = {
    "Content-Type": "application/json",
    ...(requestOptions.headers ?? {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    const isAbort = error instanceof Error && error.name === "AbortError";
    if (retries > 0) {
      const delayMs = RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - retries] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      await sleep(delayMs);
      return apiRequest<T>(path, { ...options, maxRetries: retries - 1 });
    }
    if (isAbort) {
      throw new ApiError("Request timed out. Please check your connection and try again.", 408);
    }
    throw error;
  }

  if (response.status === 401 && !skipAuthRefresh) {
    const refreshResult = await refreshAuthToken();
    if (refreshResult.status === "refreshed") {
      return apiRequest<T>(path, {
        ...requestOptions,
        headers: {
          ...(requestOptions.headers ?? {}),
          Authorization: `Bearer ${refreshResult.token}`,
        },
        skipAuthRefresh: true,
      });
    }
    if (refreshResult.status === "rejected") {
      notifyUnauthorized();
    } else {
      throw new ApiError(
        "We could not refresh your session. Check your connection and try again.",
        503,
        { code: "session_refresh_unavailable" },
      );
    }
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let payload: ApiErrorPayload | undefined;
    try {
      const text = await response.text();
      if (text) {
        try {
          const data = JSON.parse(text) as ApiErrorPayload;
          payload = data;
          if (data?.message) {
            message = data.message;
          } else if (data?.errors && typeof data.errors === "object") {
            const first = Object.values(data.errors)
              .flatMap((value) => (Array.isArray(value) ? value : [value]))
              .find((value) => typeof value === "string" && value.trim().length > 0);
            if (first) {
              message = first;
            } else if (data?.title) {
              message = data.title;
            } else {
              message = text;
            }
          } else if (data?.title) {
            message = data.title;
          } else {
            message = text;
          }
        } catch {
          message = text;
        }
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
