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
  message?: string;
};

type ApiRequestInit = RequestInit & {
  skipAuthRefresh?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestInit = {},
): Promise<T> {
  const { skipAuthRefresh, ...requestOptions } = options;
  const headers = {
    "Content-Type": "application/json",
    ...(requestOptions.headers ?? {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers,
  });

  if (response.status === 401 && !skipAuthRefresh) {
    const nextToken = await refreshAuthToken();
    if (nextToken) {
      return apiRequest<T>(path, {
        ...requestOptions,
        headers: {
          ...(requestOptions.headers ?? {}),
          Authorization: `Bearer ${nextToken}`,
        },
        skipAuthRefresh: true,
      });
    }
    notifyUnauthorized();
  } else if (response.status === 401) {
    notifyUnauthorized();
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as ApiErrorPayload;
      if (data?.message) message = data.message;
    } catch {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch {
        // ignore parse errors
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
