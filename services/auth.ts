import * as SecureStore from "expo-secure-store";

import { apiRequest } from "@/services/api";
import { getAuthToken, setAuthToken } from "@/services/auth-session";
import { API_BASE_URL } from "@/services/api";
import { ErrorReporter } from "@/services/error-reporter";

export type AuthUser = {
  id: string;
  email: string;
  verified?: boolean | null;
  emailVerified?: boolean | null;
  isEmailVerified?: boolean | null;
  emailConfirmed?: boolean | null;
  isVerified?: boolean | null;
  emailVerifiedAt?: string | null;
  emailConfirmedAt?: string | null;
  displayName?: string | null;
  phone?: string | null;
  city?: string | null;
  role: string;
  isSeller: boolean;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: string | null;
};

export type RegisterResponse = {
  user: AuthUser;
  token?: string | null;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: string | null;
  emailVerificationRequired?: boolean | null;
};

export type RegisterPayload = {
  email: string;
  password: string;
  name?: string;
  displayName?: string;
  phone?: string;
  city?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type VerifyEmailPayload = {
  token?: string;
  code?: string;
  email?: string;
};

const TOKEN_STORAGE_KEY = "sbay.auth.token";
const REFRESH_TOKEN_STORAGE_KEY = "sbay.auth.refreshToken";

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  });
  await storeAuthTokens(response.token, response.refreshToken ?? null);
  return response;
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await apiRequest<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  });
  if (response.token) {
    await storeAuthTokens(response.token, response.refreshToken ?? null);
  }
  return response;
}

export async function requestEmailVerification(): Promise<void> {
  await apiRequest<void>("/api/auth/request-email-verification", {
    method: "POST",
    headers: await authHeader(),
  });
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<void> {
  await apiRequest<void>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  });
}

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
  setAuthToken(token);
}

export async function storeAuthTokens(token: string, refreshToken?: string | null): Promise<void> {
  await storeToken(token);
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export async function getStoredToken(): Promise<string | null> {
  const cached = getAuthToken();
  if (cached) return cached;
  const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  if (token) setAuthToken(token);
  return token;
}

export async function logout(): Promise<void> {
  await clearStoredToken();
}

export async function clearStoredToken(): Promise<void> {
  const failures: unknown[] = [];
  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY).catch((error) => {
    failures.push(error);
  });
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY).catch((error) => {
    failures.push(error);
  });
  if (failures.length > 0) {
    throw new Error("Unable to clear stored auth tokens.");
  }
  setAuthToken(null);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY);
}

export async function refreshStoredToken(): Promise<string | null> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return null;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Network unavailable — preserve stored tokens so the user stays signed in.
    // The next request after connectivity resumes will retry the refresh.
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    // Server explicitly rejected the refresh token — sign the user out.
    await clearStoredToken().catch((error) => {
      ErrorReporter.captureException(error, { context: "clearStoredToken after refresh rejection" });
    });
    return null;
  }

  if (!response.ok) {
    // Transient server error — don't clear the token; let the caller retry later.
    return null;
  }

  const data = (await response.json()) as AuthResponse;
  await storeAuthTokens(data.token, data.refreshToken ?? null);
  return data.token;
}

export async function revokeStoredRefreshToken(): Promise<void> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return;

  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiRequest<void>("/api/auth/change-password", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
