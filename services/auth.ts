import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest } from "@/services/api";

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
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.token);
  return response;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.token);
  return response;
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}
