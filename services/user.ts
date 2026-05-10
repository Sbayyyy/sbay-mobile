import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

export type UserProfile = {
  id: string;
  email: string;
  displayName?: string | null;
  phone?: string | null;
  city?: string | null;
  avatar?: string | null;
  role: string;
  isSeller: boolean;
  createdAt: string;
  lastTime?: string | null;
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  reviewCount: number;
  rating: number;
  listingBanned: boolean;
  listingBanUntil?: string | null;
  listingLimit?: number | null;
  listingLimitCount: number;
  listingLimitResetAt?: string | null;
};

export type UpdateProfilePayload = {
  displayName?: string | null;
  phone?: string | null;
  city?: string | null;
  avatar?: string | null;
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function getMyProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/api/users/me", {
    headers: await authHeader(),
  });
}

export async function updateMyProfile(
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  return apiRequest<UserProfile>("/api/users/me", {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(payload ?? {}),
  });
}

export type SellerProfile = {
  id: string;
  name: string;
  avatar?: string | null;
  rating: number;
  reviewCount: number;
  totalOrders: number;
  city?: string | null;
  createdAt: string;
};

export async function getSellerProfile(id: string): Promise<SellerProfile> {
  return apiRequest<SellerProfile>(`/api/users/${id}`);
}
