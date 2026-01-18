import Constants from "expo-constants";
import { notifyUnauthorized } from "@/services/auth-session";

const fallbackBaseUrl = "http://localhost:8080";

const extraBaseUrl =
  (Constants.expoConfig as { extra?: { apiBaseUrl?: string } } | null)?.extra
    ?.apiBaseUrl ?? null;

const rawBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? extraBaseUrl ?? fallbackBaseUrl;

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

type ApiErrorPayload = {
  message?: string;
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
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
