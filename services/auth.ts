import * as SecureStore from "expo-secure-store";

import { apiRequest } from "@/services/api";
import { getAuthToken, setAuthToken } from "@/services/auth-session";

export type AuthUser = {
  id: string;
  email: string;
  displayName?: string | null;
  phone?: string | null;
  city?: string | null;
  role: string;
  isSeller: boolean;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
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

const TOKEN_STORAGE_KEY = "sbay.auth.token";

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await storeToken(response.token);
  return response;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await storeToken(response.token);
  return response;
}

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
  setAuthToken(token);
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
  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
  setAuthToken(null);
}

async function authHeader() {
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
